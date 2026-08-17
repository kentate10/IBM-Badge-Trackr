import { NextResponse } from "next/server";
import { PrismaClient, Status } from "@prisma/client";
import { SCOPE_ONLY_ITEMS } from "@/lib/scope";

// TEMPORARY, idempotent one-off data-correction route (reused pattern from
// 2026-08-12). The 2026-08-12/13 batches (Antonio, David, Diana, Rodrigo's
// AGILE+industry, Ricardo, Mariana) are already confirmed live in production
// (see commit 965df1d) — replaced below with the 2026-08-14 batch: Rodrigo
// Chavarria's Slack reply confirmed Consulting Academy done and 4 years
// 3 months at IBM (satisfies "Experience (3+ yrs PM/1+ yr IBM)"). Also
// ensures the 3 new "Scope" tab SkillItem rows exist (see lib/scope.ts) —
// schema-free, just new SkillItem rows using the existing Tracker enum, no
// migration needed. Safe to hit more than once (upserts only). Remove this
// route, verify-update, and the /api/debug middleware exemption once
// confirmed applied.

const prisma = new PrismaClient();

type Update = { email: string; itemKey: string; status: Status; percent?: number };

const updates: Update[] = [
  // --- 2026-08-14 batch (confirmed applied 2026-08-17, see verify-update) ---
  // Rodrigo Chavarria Calderon — "Consulting academy completado" (Slack, 2026-08-14)
  { email: "Rodrigo.Chavarria@ibm.com", itemKey: "general_consulting_academy", status: "MET" },
  // Rodrigo Chavarria Calderon — 4 years 3 months at IBM, satisfies the
  // PM Experienced Experience column (same pattern used for David/Federico/Jerry)
  { email: "Rodrigo.Chavarria@ibm.com", itemKey: "pm_exp_experience", status: "MET" },

  // --- 2026-08-17 follow-up: restore a drifted field found during verify-update ---
  // Rodrigo Chavarria Calderon — general_industry_badge had drifted to
  // IN_PROGRESS (was MET as of commit 965df1d / 2026-08-13, confirmed via
  // w3 full-credential check: Media and Entertainment Industry Jumpstart,
  // and Rodrigo re-confirmed holding it directly in his 2026-08-14 Slack
  // reply). Cause of the drift is unconfirmed (possibly a manual edit in
  // the live app during 2026-08-14/17) — restoring to the verified-correct
  // value per the standing rule that any industry badge tier = Met on this
  // untiered General Tracker column. Flagged to Ken regardless.
  { email: "Rodrigo.Chavarria@ibm.com", itemKey: "general_industry_badge", status: "MET" },
];

const yearsUpdates: { email: string; years: number }[] = [
  // Rodrigo Chavarria Calderon — "4 años y 3 meses en IBM" (Slack, 2026-08-14)
  { email: "Rodrigo.Chavarria@ibm.com", years: 4.25 },
];

// Several emails fail an exact findUnique match despite looking identical
// in JSON output (allMembers lists them verbatim) — almost certainly a
// hidden character (stray whitespace / non-breaking space) from however
// those rows were originally seeded. First found on Luis.Gomez.G@ibm.com;
// the 2026-08-13 run confirmed the same failure for David, Rodrigo, and
// Ricardo too (all three showed up as "no member" skips), so this is a
// wider seeding issue, not a one-off. Fall back to a name-based lookup,
// which sidesteps whatever is wrong with the stored email string.
const NAME_FALLBACK: Record<string, string> = {
  "Luis.Gomez.G@ibm.com": "Luis Martin Gomez Gonzalez",
  "David.Villalobos@ibm.com": "David Villalobos Arguedas",
  "Rodrigo.Chavarria@ibm.com": "Rodrigo Chavarria",
  "rlobo@ibm.com": "Ricardo Lobo",
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

  // Ensure the Scope tab's 3 dedicated SkillItem rows exist before anything
  // else runs (harmless no-op once they're created — upsert is idempotent).
  for (const si of SCOPE_ONLY_ITEMS) {
    await prisma.skillItem.upsert({
      where: { key: si.key },
      update: {
        label: si.label,
        section: si.section,
        tracker: si.tracker,
        role: si.role,
        band: si.band,
        hasPercent: si.hasPercent,
      },
      create: si,
    });
    results.push(`ensured skillItem: ${si.key}`);
  }

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
