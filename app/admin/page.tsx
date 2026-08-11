import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Status } from "@prisma/client";
import StatusDonut from "@/components/charts/StatusDonut";
import MemberBarChart from "@/components/charts/MemberBarChart";
import SectionBarChart from "@/components/charts/SectionBarChart";
import TrendLineChart from "@/components/charts/TrendLineChart";
import SnapshotButton from "./SnapshotButton";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [members, items, allProgress, snapshots] = await Promise.all([
    prisma.member.findMany({ orderBy: { name: "asc" } }),
    prisma.skillItem.findMany(),
    prisma.progress.findMany(),
    prisma.snapshot.findMany({ orderBy: { takenAt: "asc" } }),
  ]);

  const itemById = new Map(items.map((i) => [i.id, i]));
  const progressByMember = new Map<string, typeof allProgress>();
  for (const p of allProgress) {
    if (!progressByMember.has(p.memberId)) progressByMember.set(p.memberId, []);
    progressByMember.get(p.memberId)!.push(p);
  }

  const statusCounts: Record<Status, number> = { MET: 0, NOT_MET: 0, IN_PROGRESS: 0, BLOCKED: 0 };
  const sectionCounts = new Map<string, Record<Status, number>>();
  const memberPct: { id: string; name: string; pct: number; met: number; total: number }[] = [];

  for (const member of members) {
    const applicable = items.filter(
      (it) => (it.role === null || it.role === member.role) && (it.band === null || it.band === member.band)
    );
    const memberProgress = progressByMember.get(member.id) ?? [];
    const progByItemId = new Map(memberProgress.map((p) => [p.skillItemId, p]));

    let met = 0;
    for (const item of applicable) {
      const status: Status = progByItemId.get(item.id)?.status ?? "NOT_MET";
      statusCounts[status] += 1;
      if (status === "MET") met += 1;

      if (!sectionCounts.has(item.section)) {
        sectionCounts.set(item.section, { MET: 0, NOT_MET: 0, IN_PROGRESS: 0, BLOCKED: 0 });
      }
      sectionCounts.get(item.section)![status] += 1;
    }

    memberPct.push({
      id: member.id,
      name: member.name,
      pct: applicable.length ? Math.round((met / applicable.length) * 100) : 0,
      met,
      total: applicable.length,
    });
  }

  memberPct.sort((a, b) => b.pct - a.pct);

  const teamTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const teamPct = teamTotal ? Math.round((statusCounts.MET / teamTotal) * 100) : 0;
  const at100 = memberPct.filter((m) => m.pct === 100).length;
  const below50 = memberPct.filter((m) => m.pct < 50).length;

  const sectionData = [...sectionCounts.entries()]
    .map(([name, counts]) => ({
      name,
      met: counts.MET,
      inProgress: counts.IN_PROGRESS,
      blocked: counts.BLOCKED,
      notMet: counts.NOT_MET,
    }))
    // Keep table order roughly matching the original workbook sections.
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Panel general</h1>
          <p className="text-sm text-slate-500">Avance del equipo en Badge Acceleration — 2026 Core Skills Expectations</p>
        </div>
        <SnapshotButton />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Avance del equipo" value={`${teamPct}%`} />
        <StatCard label="Personas al 100%" value={`${at100} / ${members.length}`} />
        <StatCard label="Por debajo de 50%" value={String(below50)} tone={below50 > 0 ? "warn" : "default"} />
        <StatCard label="Snapshots guardados" value={String(labelOrder.length)} />
      </div>

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

      <ChartCard title="Avance en el tiempo (quincenal)">
        {trendData.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Aún no hay snapshots guardados. Usá el botón &ldquo;Guardar snapshot quincenal&rdquo; arriba cada dos semanas para
            empezar a ver la tendencia acá.
          </p>
        ) : (
          <TrendLineChart data={trendData} series={["Equipo", "PM", "BA"]} />
        )}
      </ChartCard>

      <ChartCard title="Equipo">
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
                    <Link href={`/member/${m.id}`} className="font-medium text-blue-600 hover:underline">
                      {m.name}
                    </Link>
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
