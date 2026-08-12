/* eslint-disable no-console */
// One-off data correction, run once via a temporary preDeployCommand override
// (same pattern as the original db:seed run). Applies the Slack replies from
// Tatiana, Celia, Luis and Javier received 2026-08-12. Safe to re-run
// (idempotent upserts) — does NOT touch anything not listed below, unlike
// the full seed.ts.
import { PrismaClient, Status } from "@prisma/client";

const prisma = new PrismaClient();

type Update = { email: string; itemKey: string; status: Status; percent?: number };

const updates: Update[] = [
  // Celia Hernandez Vargas — JRS Met, Core Training done Feb. Industry
  // badge (ba_fnd_industry) already MET from seed; Consulting Academy left
  // untouched (Not Applicable for her band per Ricardo, no NOT_APPLICABLE
  // status exists — leaving it unset reads closest to "N/A" in the UI).
  { email: "cehernan@cr.ibm.com", itemKey: "general_core_training", status: "MET" },
  { email: "cehernan@cr.ibm.com", itemKey: "general_jrs_upskill", status: "MET" },

  // Tatiana Pereira Mora — JRS Met, Core Training done Feb, Consulting
  // Academy Track 2 done (Ken's call: treat as fully Met). Mentor badge has
  // a draft ready to submit, not yet earned.
  { email: "tpereira@cr.ibm.com", itemKey: "general_consulting_academy", status: "MET" },
  { email: "tpereira@cr.ibm.com", itemKey: "general_core_training", status: "MET" },
  { email: "tpereira@cr.ibm.com", itemKey: "general_jrs_upskill", status: "MET" },
  { email: "tpereira@cr.ibm.com", itemKey: "ba_exp_mentor", status: "IN_PROGRESS", percent: 85 },

  // Luis Martin Gomez Gonzalez — PSM I / DASSM confirmed as satisfying
  // AGILE Scrum Master. Expert PM badge in progress (4 courses left, 3
  // small + 1 twenty-five-hour one). Industry badge only Jumpstart so far,
  // Silver application in progress. Consulting Academy restarted at
  // Experienced level (band change), Track 1 of it. Core Training done.
  { email: "Luis.Gomez.G@ibm.com", itemKey: "pm_expert_experience", status: "MET" },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "pm_expert_agile", status: "MET", percent: 100 },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "pm_expert_badge", status: "IN_PROGRESS", percent: 70 },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "general_industry_badge", status: "IN_PROGRESS" },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "general_consulting_academy", status: "IN_PROGRESS" },
  { email: "Luis.Gomez.G@ibm.com", itemKey: "general_core_training", status: "MET" },

  // Javier Robles Vargas — JRS Met, Core Training completed. AGILE Scrum
  // Master: "not yet, working on it" -> In Progress. Cert ITIL4 Specialist
  // and Consulting Academy intentionally NOT touched here — his answers
  // ("ITIL v4" tier unclear; "T3 completed" doesn't confirm T1/T2) are
  // ambiguous against what those columns actually require, flagged to Ken
  // rather than guessed.
  { email: "jarobles@cr.ibm.com", itemKey: "pm_expert_experience", status: "MET" },
  { email: "jarobles@cr.ibm.com", itemKey: "pm_expert_agile", status: "IN_PROGRESS", percent: 40 },
  { email: "jarobles@cr.ibm.com", itemKey: "general_core_training", status: "MET" },
  { email: "jarobles@cr.ibm.com", itemKey: "general_jrs_upskill", status: "MET" },
];

const yearsUpdates: { email: string; years: number }[] = [
  { email: "tpereira@cr.ibm.com", years: 18.5 }, // she said "18-19, ni me acuerdo"
  { email: "Luis.Gomez.G@ibm.com", years: 4.5 },
  { email: "jarobles@cr.ibm.com", years: 11 },
];

async function main() {
  for (const u of updates) {
    const member = await prisma.member.findUnique({ where: { email: u.email } });
    if (!member) {
      console.error(`SKIP: no member with email ${u.email}`);
      continue;
    }
    const item = await prisma.skillItem.findUnique({ where: { key: u.itemKey } });
    if (!item) {
      console.error(`SKIP: no skill item with key ${u.itemKey}`);
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
    console.log(`OK  ${u.email} / ${u.itemKey} -> ${u.status}`);
  }

  for (const y of yearsUpdates) {
    const member = await prisma.member.findUnique({ where: { email: y.email } });
    if (!member) {
      console.error(`SKIP years: no member with email ${y.email}`);
      continue;
    }
    await prisma.member.update({ where: { email: y.email }, data: { yearsAtIbm: y.years } });
    console.log(`OK  years ${y.email} -> ${y.years}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
