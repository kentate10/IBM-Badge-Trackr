import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SCOPE_KEY_PREFIX } from "@/lib/scope";

// TEMPORARY, READ-ONLY debug endpoint to confirm prisma/update-2026-08-12.ts
// actually applied its changes to the live database. No auth (nothing here
// is sensitive beyond what admins already see in the app), safe to remove
// once confirmed.
export const dynamic = "force-dynamic";

// Widened 2026-08-17 to the full 16-person roster, for a comprehensive
// cross-check of Scope's underlying real items (pm_exp_agile/pm_expert_agile,
// general_industry_badge, pm_exp_badge/pm_expert_badge, pm_exp_itil/
// pm_expert_itil_specialist, ba_fnd_industry/ba_exp_industry, ba_fnd_design_
// thinking/ba_exp_design_thinking_cocreator, ba_exp_mentor, and the 4
// ba_exp_ic_property/speaker/teacher/champion choose-1 badges) against
// everyone's known-true status, not just the last few batches' people.
const CHECK_EMAILS = [
  "alara@cr.ibm.com",
  "cehernan@cr.ibm.com",
  "David.Villalobos@ibm.com",
  "dquesada@ibm.com",
  "Federico.Cruz.Chaverri@ibm.com",
  "jarobles@cr.ibm.com",
  "jesegura@cr.ibm.com",
  "J.Alpizar@ibm.com",
  "kender.tate@ibm.com",
  "Luis.Gomez.G@ibm.com",
  "mcarvaja@cr.ibm.com",
  "njimenez@cr.ibm.com",
  "anperez@cr.ibm.com",
  "rlobo@ibm.com",
  "Rodrigo.Chavarria@ibm.com",
  "tpereira@cr.ibm.com",
];

// David, Rodrigo, Ricardo, and Luis's stored emails fail an exact match
// (same hidden-character issue documented in run-update's NAME_FALLBACK) —
// a plain findMany-by-email silently drops them. Cross-check by name too so
// this route's before/after view doesn't miss them the way the raw email
// query does.
const CHECK_NAME_FALLBACK = [
  "David Villalobos Arguedas",
  "Rodrigo Chavarria",
  "Ricardo Lobo",
  "Luis Martin Gomez Gonzalez",
];

export async function GET() {
  const members = await prisma.member.findMany({
    where: { OR: [{ email: { in: CHECK_EMAILS } }, { name: { in: CHECK_NAME_FALLBACK } }] },
    select: {
      email: true,
      name: true,
      yearsAtIbm: true,
      progress: {
        select: {
          status: true,
          percent: true,
          skillItem: { select: { key: true } },
        },
      },
    },
  });

  // Full roster (email + name only) so a checked email that comes back
  // missing above can be cross-referenced against what's actually stored —
  // e.g. Luis.Gomez.G@ibm.com not matching CHECK_EMAILS revealed the real
  // stored email differs from prisma/seed.ts's literal string.
  const allMembers = await prisma.member.findMany({
    select: { email: true, name: true },
    orderBy: { name: "asc" },
  });

  // Confirms the 3 Scope-tab-only SkillItem rows exist with the right shape
  // (see lib/scope.ts) — created via run-update's upsert, not a migration.
  const scopeItems = await prisma.skillItem.findMany({
    where: { key: { startsWith: SCOPE_KEY_PREFIX } },
    select: { key: true, label: true, section: true, role: true, band: true },
  });

  return NextResponse.json({ checkedAt: new Date().toISOString(), members, allMembers, scopeItems });
}
