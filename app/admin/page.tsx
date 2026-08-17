import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Status } from "@prisma/client";
import StatusDonut from "@/components/charts/StatusDonut";
import MemberBarChart from "@/components/charts/MemberBarChart";
import SectionBarChart, { type SectionBarDatum } from "@/components/charts/SectionBarChart";
import TrendLineChart from "@/components/charts/TrendLineChart";
import SnapshotButton from "./SnapshotButton";
import WeekSelector from "./WeekSelector";
import ExportButtons from "./ExportButtons";
import { buildRecommendations, type Recommendation } from "@/lib/recommendations";
import { SCOPE_KEY_PREFIX } from "@/lib/scope";

export const dynamic = "force-dynamic";

type MemberRow = { id: string; name: string; pct: number; met: number; total: number };

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;

  const [members, items, allProgress, snapshots, weeklySnapshots] = await Promise.all([
    prisma.member.findMany({ orderBy: { name: "asc" } }),
    // Scope-only items (see lib/scope.ts) are a separate, additive view —
    // excluded here so the main panel's numbers don't shift when that tab's
    // data changes.
    prisma.skillItem.findMany({ where: { NOT: { key: { startsWith: SCOPE_KEY_PREFIX } } } }),
    prisma.progress.findMany(),
    prisma.snapshot.findMany({ orderBy: { takenAt: "asc" } }),
    prisma.weeklySnapshot.findMany({ orderBy: { takenAt: "desc" }, select: { label: true, teamPercent: true } }),
  ]);

  const selectedWeek = week && weeklySnapshots.some((w) => w.label === week) ? week : null;

  // --- Live aggregation. Always computed: it powers the trend chart no
  // matter what's selected, and is the default view when no week is picked. ---
  const progressByMember = new Map<string, typeof allProgress>();
  for (const p of allProgress) {
    if (!progressByMember.has(p.memberId)) progressByMember.set(p.memberId, []);
    progressByMember.get(p.memberId)!.push(p);
  }

  const liveStatusCounts: Record<Status, number> = { MET: 0, NOT_MET: 0, IN_PROGRESS: 0, BLOCKED: 0 };
  const liveSectionCounts = new Map<string, Record<Status, number>>();
  const liveMemberPct: MemberRow[] = [];

  for (const member of members) {
    const applicable = items.filter(
      (it) => (it.role === null || it.role === member.role) && (it.band === null || it.band === member.band)
    );
    const memberProgress = progressByMember.get(member.id) ?? [];
    const progByItemId = new Map(memberProgress.map((p) => [p.skillItemId, p]));

    let met = 0;
    for (const item of applicable) {
      const status: Status = progByItemId.get(item.id)?.status ?? "NOT_MET";
      liveStatusCounts[status] += 1;
      if (status === "MET") met += 1;

      if (!liveSectionCounts.has(item.section)) {
        liveSectionCounts.set(item.section, { MET: 0, NOT_MET: 0, IN_PROGRESS: 0, BLOCKED: 0 });
      }
      liveSectionCounts.get(item.section)![status] += 1;
    }

    liveMemberPct.push({
      id: member.id,
      name: member.name,
      pct: applicable.length ? Math.round((met / applicable.length) * 100) : 0,
      met,
      total: applicable.length,
    });
  }
  liveMemberPct.sort((a, b) => b.pct - a.pct);

  const liveTeamTotal = Object.values(liveStatusCounts).reduce((a, b) => a + b, 0);
  const liveTeamPct = liveTeamTotal ? Math.round((liveStatusCounts.MET / liveTeamTotal) * 100) : 0;

  const liveSectionData: SectionBarDatum[] = [...liveSectionCounts.entries()]
    .map(([name, counts]) => ({
      name,
      met: counts.MET,
      inProgress: counts.IN_PROGRESS,
      blocked: counts.BLOCKED,
      notMet: counts.NOT_MET,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Trend: average % complete per snapshot label, split by role, plus team overall.
  const labelOrder: string[] = [];
  const byLabel = new Map<string, { all: number[]; pm: number[]; ba: number[] }>();
  const memberById = new Map(members.map((m) => [m.id, m]));
  for (const snap of snapshots) {
    if (!byLabel.has(snap.label)) {
      byLabel.set(snap.label, { all: [], pm: [], ba: [] });
      labelOrder.push(snap.label);
    }
    const bucket = byLabel.get(snap.label)!;
    bucket.all.push(snap.percentComplete);
    const role = memberById.get(snap.memberId)?.role;
    if (role === "PM") bucket.pm.push(snap.percentComplete);
    if (role === "BA") bucket.ba.push(snap.percentComplete);
  }
  const avg = (nums: number[]) => (nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : 0);
  const trendData = labelOrder.map((label) => {
    const b = byLabel.get(label)!;
    return { label, Equipo: avg(b.all), PM: avg(b.pm), BA: avg(b.ba) };
  });

  // --- Selected view: live numbers above, or a saved week's frozen
  // breakdown, so the whole dashboard (not just the trend line) shows
  // exactly how things looked that week. ---
  let statusCounts = liveStatusCounts;
  let sectionData = liveSectionData;
  let memberPct = liveMemberPct;
  let teamPct = liveTeamPct;
  let viewedLabel = "En vivo (ahora)";

  if (selectedWeek) {
    const weekly = await prisma.weeklySnapshot.findUnique({
      where: { label: selectedWeek },
      include: { memberSnapshots: { include: { member: true } } },
    });
    if (weekly) {
      statusCounts = weekly.statusBreakdown as unknown as Record<Status, number>;
      sectionData = weekly.sectionBreakdown as unknown as SectionBarDatum[];
      teamPct = Math.round(weekly.teamPercent);
      memberPct = weekly.memberSnapshots
        .map((s) => ({
          id: s.memberId,
          name: s.member.name,
          pct: Math.round(s.percentComplete),
          met: s.metCount,
          total: s.totalCount,
        }))
        .sort((a, b) => b.pct - a.pct);
      viewedLabel = weekly.label;
    }
  }

  const at100 = memberPct.filter((m) => m.pct === 100).length;
  const below50 = memberPct.filter((m) => m.pct < 50).length;

  const recommendations = buildRecommendations({ memberPct, sectionData, statusCounts, teamPct, trend: trendData });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Panel general</h1>
          <p className="text-sm text-slate-500">Avance del equipo en Badge Acceleration — 2026 Core Skills Expectations</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <WeekSelector weeks={weeklySnapshots} current={selectedWeek} />
          <ExportButtons />
          <SnapshotButton />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <strong className="font-semibold text-slate-700">¿Qué es un snapshot?</strong> Es una foto fija del avance de todo
        el equipo — el status de cada campo, cada persona y el % general — tomada en un momento dado. Se guarda con
        &ldquo;Guardar snapshot semanal&rdquo; (lo ideal es una vez por semana) y, una vez guardada, ya no cambia aunque el
        equipo siga actualizando su checklist después. Sirve para dos cosas: la tendencia del gráfico de más abajo, y el
        filtro &ldquo;Semana&rdquo; de arriba, que te deja ver el panel completo exactamente como se veía esa semana.
      </div>

      {selectedWeek && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Estás viendo el snapshot de <strong>{viewedLabel}</strong>, no los datos actuales.{" "}
          <Link href="/admin" className="font-medium underline">
            Volver a en vivo
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Avance del equipo" value={`${teamPct}%`} />
        <StatCard label="Personas al 100%" value={`${at100} / ${memberPct.length}`} />
        <StatCard label="Por debajo de 50%" value={String(below50)} tone={below50 > 0 ? "warn" : "default"} />
        <StatCard label="Snapshots guardados" value={String(weeklySnapshots.length)} />
      </div>

      <ChartCard title="Recomendaciones">
        <RecommendationsList items={recommendations} />
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Distribución general de estados">
          <StatusDonut counts={statusCounts} />
        </ChartCard>
        <ChartCard title="Avance por persona">
          <MemberBarChart data={memberPct.map((m) => ({ name: m.name, pct: m.pct }))} />
        </ChartCard>
      </div>

      <ChartCard title="Avance por sección (detalle)">
        <SectionBarChart data={sectionData} />
      </ChartCard>

      <ChartCard title="Avance en el tiempo (semanal)">
        {trendData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Aún no hay snapshots guardados. Usá el botón &ldquo;Guardar snapshot semanal&rdquo; arriba para empezar a ver la
            tendencia acá.
          </p>
        ) : (
          <TrendLineChart data={trendData} series={["Equipo", "PM", "BA"]} />
        )}
      </ChartCard>

      <ChartCard title={selectedWeek ? `Equipo — ${viewedLabel}` : "Equipo"}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Avance</th>
                <th className="py-2 pr-4">Completado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memberPct.map((m) => (
                <tr key={m.id}>
                  <td className="py-2.5 pr-4">
                    {selectedWeek ? (
                      <span className="font-medium text-slate-700">{m.name}</span>
                    ) : (
                      <Link href={`/member/${m.id}`} className="font-medium text-blue-600 hover:underline">
                        {m.name}
                      </Link>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${m.pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">{m.pct}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500">
                    {m.met} / {m.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

function StatCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warn" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "warn" ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
      {children}
    </div>
  );
}

function RecommendationsList({ items }: { items: Recommendation[] }) {
  const cardStyle: Record<Recommendation["severity"], string> = {
    high: "border-rose-200 bg-rose-50",
    medium: "border-amber-200 bg-amber-50",
    info: "border-slate-200 bg-slate-50",
  };
  const dotStyle: Record<Recommendation["severity"], string> = {
    high: "bg-rose-500",
    medium: "bg-amber-500",
    info: "bg-slate-400",
  };

  return (
    <ul className="space-y-2">
      {items.map((r, i) => (
        <li key={i} className={`flex gap-3 rounded-lg border px-3 py-2.5 ${cardStyle[r.severity]}`}>
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotStyle[r.severity]}`} />
          <div>
            <p className="text-sm font-medium text-slate-800">{r.title}</p>
            <p className="text-sm text-slate-600">{r.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
