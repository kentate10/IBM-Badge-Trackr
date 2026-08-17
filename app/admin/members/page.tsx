import Link from "next/link";
import { prisma } from "@/lib/db";
import { roleBandLabel } from "@/lib/labels";
import { SCOPE_KEY_PREFIX } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const [members, items, progress] = await Promise.all([
    prisma.member.findMany({ orderBy: [{ role: "asc" }, { band: "asc" }, { name: "asc" }] }),
    // Scope-only items are excluded — see lib/scope.ts.
    prisma.skillItem.findMany({ where: { NOT: { key: { startsWith: SCOPE_KEY_PREFIX } } } }),
    prisma.progress.findMany(),
  ]);

  const progressByMember = new Map<string, typeof progress>();
  for (const p of progress) {
    if (!progressByMember.has(p.memberId)) progressByMember.set(p.memberId, []);
    progressByMember.get(p.memberId)!.push(p);
  }

  const groups = new Map<string, typeof members>();
  for (const m of members) {
    const key = roleBandLabel(m.role, m.band);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Equipo</h1>
        <p className="text-sm text-slate-500">{members.length} personas. Hacé clic en alguien para ver o editar su progreso.</p>
      </div>

      {[...groups.entries()].map(([label, list]) => (
        <div key={label}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m) => {
              const applicable = items.filter(
                (it) => (it.role === null || it.role === m.role) && (it.band === null || it.band === m.band)
              );
              const memberProgress = progressByMember.get(m.id) ?? [];
              const met = memberProgress.filter((p) => applicable.some((it) => it.id === p.skillItemId) && p.status === "MET").length;
              const pct = applicable.length ? Math.round((met / applicable.length) * 100) : 0;

              return (
                <Link
                  key={m.id}
                  href={`/member/${m.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <p className="font-medium text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.email}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-500">{pct}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
