import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SCOPE_KEY_PREFIX } from "@/lib/scope";

// TEMPORARY, READ-ONLY debug endpoint to confirm prisma/update-2026-08-12.ts
// actually applied its changes to the live database. No auth (nothing here
// is sensitive beyond what admins already see in the app), safe to remove
// once confirmed.
export const dynamic = "force-dynamic";

const CHECK_EMAILS = [
  // 2026-08-14 batch being applied this run
  "Rodrigo.Chavarria@ibm.com",
  // earlier 2026-08-12/13 batches, included to reconfirm they're still live
  "alara@cr.ibm.com",
  "David.Villalobos@ibm.com",
  "dquesada@ibm.com",
  "rlobo@ibm.com",
  "mcarvaja@cr.ibm.com",
  "tpereira@cr.ibm.com",
  "Luis.Gomez.G@ibm.com",
  "jarobles@cr.ibm.com",
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
