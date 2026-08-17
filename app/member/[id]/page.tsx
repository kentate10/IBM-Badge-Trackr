import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { roleBandLabel } from "@/lib/labels";
import { SCOPE_KEY_PREFIX } from "@/lib/scope";
import Nav from "@/components/Nav";
import ProgressForm, { type ItemRow } from "@/components/ProgressForm";
import MemberRoleEditor from "@/components/MemberRoleEditor";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "member" && session.memberId !== id) {
    redirect(session.memberId ? `/member/${session.memberId}` : "/select-member");
  }

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) notFound();

  // Scope-only items are excluded from each person's own checklist too —
  // they're managed by admins on the dedicated /admin/scope tab, not here.
  // See lib/scope.ts.
  const applicableItems = await prisma.skillItem.findMany({
    where: {
      AND: [
        { OR: [{ role: null, band: null }, { role: member.role, band: member.band }] },
        { NOT: { key: { startsWith: SCOPE_KEY_PREFIX } } },
      ],
    },
    orderBy: { displayOrder: "asc" },
  });

  const existingProgress = await prisma.progress.findMany({ where: { memberId: member.id } });
  const progressByItem = new Map(existingProgress.map((p) => [p.skillItemId, p]));

  const rows: ItemRow[] = applicableItems.map((item) => {
    const p = progressByItem.get(item.id);
    return {
      skillItemId: item.id,
      key: item.key,
      label: item.label,
      section: item.section,
      hasPercent: item.hasPercent,
      optional: item.optional,
      helpText: item.helpText,
      status: p?.status ?? "NOT_MET",
      percent: p?.percent ?? 0,
    };
  });

  const metCount = rows.filter((r) => r.status === "MET").length;
  const pct = rows.length ? Math.round((metCount / rows.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <Nav role={session.role} memberName={member.name} />
      <div className="mx-auto max-w-3xl px-4 py-8">
        {session.role === "admin" && (
          <Link href="/admin/members" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
            ← Volver al equipo
          </Link>
        )}

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{member.name}</h1>
            <p className="text-sm text-slate-500">
              {roleBandLabel(member.role, member.band)}
              {member.yearsAtIbm != null && ` · ${member.yearsAtIbm} años en IBM`}
            </p>
            {session.role === "admin" && (
              <MemberRoleEditor memberId={member.id} initialRole={member.role} initialBand={member.band} />
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-slate-900">{pct}%</p>
            <p className="text-xs text-slate-400">
              {metCount} de {rows.length} completado
            </p>
          </div>
        </div>

        {member.notes && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong className="font-semibold">Nota:</strong> {member.notes}
          </div>
        )}

        {/* Keyed on role/band so the form remounts (and drops stale client
            state) right after an admin reassigns this person's role/band —
            otherwise the checklist below would keep showing the old items
            until a manual hard refresh. */}
        <ProgressForm key={`${member.role}-${member.band}`} memberId={member.id} items={rows} />
      </div>
    </div>
  );
}
