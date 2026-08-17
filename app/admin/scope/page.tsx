import { prisma } from "@/lib/db";
import type { Band, Status } from "@prisma/client";
import StatusDonut from "@/components/charts/StatusDonut";
import MemberBarChart from "@/components/charts/MemberBarChart";
import SectionBarChart, { type SectionBarDatum } from "@/components/charts/SectionBarChart";
import { BAND_LABELS } from "@/lib/labels";
import { PM_SCOPE_COLUMNS, BA_SCOPE_COLUMNS, scopeKeyForBand, type ScopeColumn } from "@/lib/scope";
import ScopeTable, { type ScopeRow } from "./ScopeTable";

export const dynamic = "force-dynamic";

const ALL_BANDS: Band[] = ["FOUNDATION", "EXPERIENCED", "EXPERT"];
const BAND_ORDER: Record<Band, number> = { FOUNDATION: 0, EXPERIENCED: 1, EXPERT: 2 };

export default async function ScopePage() {
  const allKeys = new Set<string>();
  for (const col of [...PM_SCOPE_COLUMNS, ...BA_SCOPE_COLUMNS]) {
    for (const band of ALL_BANDS) {
      const key = scopeKeyForBand(col, band);
      if (key) allKeys.add(key);
    }
  }

  const [members, items, progress] = await Promise.all([
    prisma.member.findMany({ orderBy: { name: "asc" } }),
    prisma.skillItem.findMany({ where: { key: { in: [...allKeys] } } }),
    prisma.progress.findMany({ where: { skillItem: { key: { in: [...allKeys] } } } }),
  ]);

  const itemByKey = new Map(items.map((it) => [it.key, it]));
  const progressByMemberItem = new Map(progress.map((p) => [`${p.memberId}:${p.skillItemId}`, p]));

  function buildRows(role: "PM" | "BA", columns: ScopeColumn[]): ScopeRow[] {
    return members
      .filter((m) => m.role === role)
      .sort((a, b) => BAND_ORDER[a.band] - BAND_ORDER[b.band] || a.name.localeCompare(b.name))
      .map((m) => ({
        memberId: m.id,
        name: m.name,
        band: BAND_LABELS[m.band],
        cells: columns.map((col): ScopeRow["cells"][number] => {
          const key = scopeKeyForBand(col, m.band);
          const item = key ? itemByKey.get(key) : undefined;
          if (!item) return { applicable: false };
          const p = progressByMemberItem.get(`${m.id}:${item.id}`);
          return {
            applicable: true,
            skillItemId: item.id,
            status: (p?.status ?? "NOT_MET") as Status,
            percent: p?.percent ?? 0,
          };
        }),
      }));
  }

  const pmRows = buildRows("PM", PM_SCOPE_COLUMNS);
  const baRows = buildRows("BA", BA_SCOPE_COLUMNS);

  // --- chart aggregation, across every applicable cell in both tables ---
  const statusCounts: Record<Status, number> = { MET: 0, NOT_MET: 0, IN_PROGRESS: 0, BLOCKED: 0 };
  const byColumn = new Map<string, Record<Status, number>>();
  const memberPct: { name: string; pct: number }[] = [];

  const groups: { rows: ScopeRow[]; columns: ScopeColumn[] }[] = [
    { rows: pmRows, columns: PM_SCOPE_COLUMNS },
    { rows: baRows, columns: BA_SCOPE_COLUMNS },
  ];

  for (const group of groups) {
    for (const row of group.rows) {
      let met = 0;
      let total = 0;
      row.cells.forEach((cell, i) => {
        if (!cell.applicable) return;
        total += 1;
        statusCounts[cell.status] += 1;
        if (cell.status === "MET") met += 1;
        const colLabel = group.columns[i].label;
        if (!byColumn.has(colLabel)) byColumn.set(colLabel, { MET: 0, NOT_MET: 0, IN_PROGRESS: 0, BLOCKED: 0 });
        byColumn.get(colLabel)![cell.status] += 1;
      });
      memberPct.push({ name: row.name, pct: total ? Math.round((met / total) * 100) : 0 });
    }
  }
  memberPct.sort((a, b) => b.pct - a.pct);

  const teamTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const teamPct = teamTotal ? Math.round((statusCounts.MET / teamTotal) * 100) : 0;
  const at100 = memberPct.filter((m) => m.pct === 100).length;
  const below50 = memberPct.filter((m) => m.pct < 50).length;

  const sectionData: SectionBarDatum[] = [...byColumn.entries()].map(([name, c]) => ({
    name,
    met: c.MET,
    inProgress: c.IN_PROGRESS,
    blocked: c.BLOCKED,
    notMet: c.NOT_MET,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Scope</h1>
        <p className="text-sm text-slate-500">
          Vista de prioridad — solo los requerimientos marcados como prioridad para este ciclo. No afecta los números del
          Panel general ni el resto del tracker.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Avance (scope)" value={`${teamPct}%`} />
        <StatCard label="Personas al 100%" value={`${at100} / ${memberPct.length}`} />
        <StatCard label="Por debajo de 50%" value={String(below50)} tone={below50 > 0 ? "warn" : "default"} />
        <StatCard label="Campos en scope" value={String(teamTotal)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Distribución general de estados (scope)">
          <StatusDonut counts={statusCounts} />
        </ChartCard>
        <ChartCard title="Avance por persona (scope)">
          <MemberBarChart data={memberPct} />
        </ChartCard>
      </div>

      <ChartCard title="Avance por requerimiento (scope)">
        <SectionBarChart data={sectionData} />
      </ChartCard>

      <ChartCard title="Project Managers">
        <ScopeTable title="PM — Scrum Master, Industry Badge, IBM PM Badge, ITIL" columns={PM_SCOPE_COLUMNS.map((c) => c.label)} rows={pmRows} />
      </ChartCard>

      <ChartCard title="Business Analysts">
        <ScopeTable
          title="BA — Industry Skill, Design Thinking, IBM Mentor, Thought Leadership"
          columns={BA_SCOPE_COLUMNS.map((c) => c.label)}
          rows={baRows}
        />
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
