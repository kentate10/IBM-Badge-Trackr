import { prisma } from "@/lib/db";
import { roleBandLabel } from "@/lib/labels";
import { SCOPE_KEY_PREFIX } from "@/lib/scope";
import ItemSelector from "./ItemSelector";
import ItemProgressTable, { type ItemMemberRow } from "./ItemProgressTable";

export const dynamic = "force-dynamic";

export default async function ByItemPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const { item } = await searchParams;

  // Scope-only items are managed from their own tab (/admin/scope), not this
  // one — see lib/scope.ts.
  const allItems = await prisma.skillItem.findMany({
    where: { NOT: { key: { startsWith: SCOPE_KEY_PREFIX } } },
    orderBy: { displayOrder: "asc" },
  });

  if (allItems.length === 0) {
    return <p className="text-sm text-slate-400">No hay requerimientos configurados todavía.</p>;
  }

  const selectedKey = item && allItems.some((it) => it.key === item) ? item : allItems[0].key;
  const selectedItem = allItems.find((it) => it.key === selectedKey)!;

  const members = await prisma.member.findMany({
    where: {
      AND: [selectedItem.role ? { role: selectedItem.role } : {}, selectedItem.band ? { band: selectedItem.band } : {}],
    },
    orderBy: { name: "asc" },
  });

  const existingProgress = await prisma.progress.findMany({
    where: { skillItemId: selectedItem.id, memberId: { in: members.map((m) => m.id) } },
  });
  const progressByMember = new Map(existingProgress.map((p) => [p.memberId, p]));

  const rows: ItemMemberRow[] = members.map((m) => {
    const p = progressByMember.get(m.id);
    return {
      memberId: m.id,
      name: m.name,
      roleBand: roleBandLabel(m.role, m.band),
      status: p?.status ?? "NOT_MET",
      percent: p?.percent ?? 0,
    };
  });

  const met = rows.filter((r) => r.status === "MET").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Por requerimiento</h1>
          <p className="text-sm text-slate-500">Elegí un requerimiento y mirá (y editá) cómo va todo el equipo en ese campo.</p>
        </div>
        <ItemSelector
          items={allItems.map((it) => ({ key: it.key, label: it.label, section: it.section }))}
          current={selectedKey}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">
          <span className="font-medium text-slate-800">{selectedItem.section}</span> — {selectedItem.label}
        </p>
        {selectedItem.helpText && <p className="mt-0.5 text-xs text-slate-400">{selectedItem.helpText}</p>}
        <p className="mt-1 text-xs text-slate-400">
          Aplica a {rows.length} {rows.length === 1 ? "persona" : "personas"} · {met} en Met
        </p>
      </div>

      <ItemProgressTable
        key={selectedItem.key}
        skillItemId={selectedItem.id}
        itemKey={selectedItem.key}
        hasPercent={selectedItem.hasPercent}
        rows={rows}
      />
    </div>
  );
}
