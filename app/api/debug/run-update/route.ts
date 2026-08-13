import { NextResponse } from "next/server";
import { PrismaClient, Status } from "@prisma/client";

// TEMPORARY, idempotent one-off data-correction route (reused pattern from
// 2026-08-12). Carries the 2026-08-12 afternoon batch (Antonio Lara's IBM
// Mentor badge + Professional Services Bronze industry badge; David
// Villalobos's Life Sciences Bronze industry badge) plus the 2026-08-13
// second follow-up round: full-credential w3 re-checks surfaced industry
// badges for Diana, Rodrigo, Ricardo, and Mariana (all previously unknown),
// and the PSM I -> "Cert: AGILE Scrum Master" equivalence (confirmed by Ken
// for both PM tables) resolves Rodrigo and Mariana's AGILE column. David's
// 2026 IBM Core Training was also confirmed done directly by Ken. Safe to
// hit more than once (upserts only). Remove this route, verify-update, and
// the /api/debug middleware exemption once confirmed applied.

const prisma = new PrismaClient();

type Update = { email: string; itemKey: string; status: Status; percent?: number };

const updates: Update[] = [
  // --- 2026-08-12 batch ---
  // Antonio Lara — IBM Mentor badge confirmed held on w3 2026-08-12
  { email: "alara@cr.ibm.com", itemKey: "ba_exp_mentor", status: "MET", percent: 100 },
  // Antonio Lara — holds Professional Services Insights and Solutions (Bronze);
  // resolves his own flagged Bronze-vs-Gold question via the band exception
  { email: "alara@cr.ibm.com", itemKey: "ba_exp_industry", status: "MET", percent: 100 },
  { email: "alara@cr.ibm.com", itemKey: "general_industry_badge", status: "MET" },
  // David Villalobos — holds Life Sciences Insights and Solutions (Bronze);
  // never answered this question in his Slack reply, fills the General Tracker gap
  { email: "David.Villalobos@ibm.com", itemKey: "general_industry_badge", status: "MET" },

  // --- 2026-08-13 second follow-up round ---
  // David Villalobos — 2026 IBM Core Training confirmed done, told directly by Ken
  { email: "David.Villalobos@ibm.com", itemKey: "general_core_training", status: "MET" },
  // Diana Quesada Castro — Chemicals and Petroleum Industry Jumpstart, new find
  { email: "dquesada@ibm.com", itemKey: "general_industry_badge", status: "MET" },
  // Rodrigo Chavarria Calderon — Media and Entertainment Industry Jumpstart, new find
  { email: "Rodrigo.Chavarria@ibm.com", itemKey: "general_industry_badge", status: "MET" },
  // Rodrigo Chavarria Calderon — holds PSM I, satisfies AGILE Scrum Master (PM Experienced)
  { email: "Rodrigo.Chavarria@ibm.com", itemKey: "pm_exp_agile", status: "MET", percent: 100 },
  // Ricardo Lobo — Energy, Environment and Utilities Industry Jumpstart, new find
  { email: "rlobo@ibm.com", itemKey: "general_industry_badge", status: "MET" },
  // Mariana Carvajal Barrios — Energy, Environment and Utilities Industry Jumpstart, new find
  { email: "mcarvaja@cr.ibm.com", itemKey: "general_industry_badge", status: "MET" },
  // Mariana Carvajal Barrios — holds PSM I, satisfies AGILE Scrum Master (PM Expert)
  { email: "mcarvaja@cr.ibm.com", itemKey: "pm_expert_agile", status: "MET", percent: 100 },
];

const yearsUpdates: { email: string; years: number }[] = [];

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
