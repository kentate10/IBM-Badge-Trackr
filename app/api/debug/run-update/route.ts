import { NextResponse } from "next/server";
import { PrismaClient, Status } from "@prisma/client";

// TEMPORARY, idempotent one-off data-correction route. Replaces the
// preDeployCommand-based approach (prisma/update-2026-08-12.ts), which was
// confirmed via /api/debug/verify-update to have never actually executed
// across 5 deploy attempts. This runs as a normal request against the
// already-running app instead, sidestepping whatever preDeployCommand issue
// caused that silent failure. Safe to hit more than once (upserts only).
// Remove this route, verify-update, and the /api/debug middleware exemption
// once confirmed applied.

const prisma = new PrismaClient();

type Update = { email: string; itemKey: string; status: Status; percent?: number };

const updates: Update[] = [
  { email: "cehernan@cr.ibm.com", itemKey: "general_core_training", status: "MET" },
  { email: "cehernan@cr.ibm.com", itemKey: "general_jrs_upskill", status: "MET" },
  { email: "tpereira@cr.ibm.com", itemKey: "general_consulting_academy", status: "MET" },
  { email: "tpereira@cr.ibm.com", itemKey: "general_core_training", status: "MET" },
  { email: "tpereira@cr.ibm.com", itemKey: "general_jrs_upskill", status: "MET" },
  { email: "tpereira@cr.ibm.com", itemKey: "ba_exp_mentor", status: "IN_PROGRESS", percent: 85 },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "pm_expert_experience", status: "MET" },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "pm_expert_agile", status: "MET", percent: 100 },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "pm_expert_badge", status: "IN_PROGRESS", percent: 70 },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "general_industry_badge", status: "IN_PROGRESS" },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "general_consulting_academy", status: "IN_PROGRESS" },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "general_core_training", status: "MET" },
  { email: "jarobles@cr.ibm.com", itemKey: "pm_expert_experience", status: "MET" },
  { email: "jarobles@cr.ibm.com", itemKey: "pm_expert_agile", status: "IN_PROGRESS", percent: 40 },
  { email: "jarobles@cr.ibm.com", itemKey: "general_core_training", status: "MET" },
  { email: "jarobles@cr.ibm.com", itemKey: "general_jrs_upskill", status: "MET" },
  { email: "jarobles@cr.ibm.com", itemKey: "general_consulting_academy", status: "MET" },
];

const yearsUpdates = [
  { email: "tpereira@cr.ibm.com", years: 18.5 },
  { email: "Luis.Gomez.G@ibm.com", years: 4.5 },
  { email: "jarobles@cr.ibm.com", years: 11 },
];

// Luis.Gomez.G@ibm.com fails an exact findUnique match despite looking
// identical in JSON output (allMembers listed it verbatim) — almost
// certainly a hidden character (stray whitespace / non-breaking space)
// from however the row was originally seeded. Fall back to a name-based
// lookup, which sidesteps whatever is wrong with the stored email string.
const NAME_FALLBACK: Record<string, string> = {
  "Luis.Gomez.G@ibm.com": "Luis Martin Gomez Gonzalez",
};

async function findMember(email: string) {
  const byEmail = await prisma.member.findUnique({ where: { email } });
  if (byEmail) return byEmail;
  const fallbackName = NAME_FALLBACK[email];
  if (!fallbackName) return null;
  return prisma.member.findFirst({ where: { name: fallbackName } });
}

export async function GET() {
  const results: string[] = [];
  const skipped: string[] = [];

  for (const u of updates) {
    const member = await findMember(u.email);
    if (!member) {
      skipped.push(`no member: ${u.email}`);
      continue;
    }
    const item = await prisma.skillItem.findUnique({ where: { key: u.itemKey } });
    if (!item) {
      skipped.push(`no skill item: ${u.itemKey}`);
      continue;
    }
    await prisma.progress.upsert({
      where: { memberId_skillItemId: { memberId: member.id, skillItemId: item.id } },
      update: { status: u.status, percent: u.percent ?? (u.status === "MET" ? 100 : 0) },
      create: {
        memberId: member.id,
        skillItemId: item.id,
        status: u.status,
        percent: u.percent ?? (u.status === "MET" ? 100 : 0),
      },
    });
    results.push(`${u.email} / ${u.itemKey} -> ${u.status}`);
  }

  for (const y of yearsUpdates) {
    const member = await findMember(y.email);
    if (!member) {
      skipped.push(`no member for years: ${y.email}`);
      continue;
    }
    await prisma.member.update({ where: { id: member.id }, data: { yearsAtIbm: y.years } });
    results.push(`years ${y.email} -> ${y.years}`);
  }

  return NextResponse.json({ ranAt: new Date().toISOString(), applied: results.length, results, skipped });
}
