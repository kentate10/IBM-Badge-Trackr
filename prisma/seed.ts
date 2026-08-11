/* eslint-disable no-console */
import { PrismaClient, Role, Band, Status, Tracker } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// 1. Skill items — every field from Skills Tracker Week 0 + General Tracker
//    Week 0, scoped by role/band. role/band = null means "applies to everyone"
//    (used for the General Tracker items).
// ---------------------------------------------------------------------------
type ItemDef = {
  key: string;
  label: string;
  section: string;
  tracker: Tracker;
  role?: Role;
  band?: Band;
  hasPercent?: boolean;
  optional?: boolean;
  helpText?: string;
};

const items: ItemDef[] = [
  // --- PM Experienced (Skills Tracker) ---
  { key: "pm_exp_experience", label: "Experience (3+ yrs PM / 1+ yr in IBM)", section: "PM Experienced", tracker: "SKILLS", role: "PM", band: "EXPERIENCED", hasPercent: false },
  { key: "pm_exp_agile", label: "Cert: AGILE Scrum Master", section: "PM Experienced", tracker: "SKILLS", role: "PM", band: "EXPERIENCED" },
  { key: "pm_exp_itil", label: "Cert: ITIL 4 Foundation", section: "PM Experienced", tracker: "SKILLS", role: "PM", band: "EXPERIENCED", optional: true, helpText: "Tracked for reference only — not mandatory." },
  { key: "pm_exp_badge", label: "Badge: IBM Experienced PM", section: "PM Experienced", tracker: "SKILLS", role: "PM", band: "EXPERIENCED" },

  // --- PM Expert (Skills Tracker) ---
  { key: "pm_expert_experience", label: "Experience (4+ yrs PM / 1+ yr in IBM)", section: "PM Expert", tracker: "SKILLS", role: "PM", band: "EXPERT", hasPercent: false },
  { key: "pm_expert_agile", label: "Cert: AGILE Scrum Master", section: "PM Expert", tracker: "SKILLS", role: "PM", band: "EXPERT" },
  { key: "pm_expert_itil_specialist", label: "Cert: ITIL4 Specialist - Create, Deliver & Support", section: "PM Expert", tracker: "SKILLS", role: "PM", band: "EXPERT" },
  { key: "pm_expert_badge", label: "Badge: IBM Expert PM", section: "PM Expert", tracker: "SKILLS", role: "PM", band: "EXPERT" },
  // "Complex Program Mgmt (Coming soon)" intentionally omitted — not live yet.

  // --- BA Foundation (Skills Tracker) ---
  { key: "ba_fnd_industry", label: "Badge: Industry Skill - Bronze", section: "BA Foundation", tracker: "SKILLS", role: "BA", band: "FOUNDATION" },
  { key: "ba_fnd_design_thinking", label: "Badge: Design Thinking Practitioner", section: "BA Foundation", tracker: "SKILLS", role: "BA", band: "FOUNDATION" },

  // --- BA Expert (Skills Tracker) ---
  { key: "ba_exp_industry", label: "Badge: Industry Skill - Gold", section: "BA Expert", tracker: "SKILLS", role: "BA", band: "EXPERT" },
  { key: "ba_exp_design_thinking_cocreator", label: "Badge: Design Thinking Co-Creator", section: "BA Expert", tracker: "SKILLS", role: "BA", band: "EXPERT" },
  { key: "ba_exp_mentor", label: "Badge: IBM Mentor", section: "BA Expert", tracker: "SKILLS", role: "BA", band: "EXPERT" },
  { key: "ba_exp_ic_property", label: "Badge (choose 1): Intellectual Capital/Property", section: "BA Expert", tracker: "SKILLS", role: "BA", band: "EXPERT", optional: true },
  { key: "ba_exp_speaker", label: "Badge (choose 1): Speaker/Presenter", section: "BA Expert", tracker: "SKILLS", role: "BA", band: "EXPERT", optional: true },
  { key: "ba_exp_teacher", label: "Badge (choose 1): Teacher/Educator", section: "BA Expert", tracker: "SKILLS", role: "BA", band: "EXPERT", optional: true },
  { key: "ba_exp_champion", label: "Badge (choose 1): Profession Champion", section: "BA Expert", tracker: "SKILLS", role: "BA", band: "EXPERT", optional: true },

  // --- General Tracker (applies to everyone, role/band = null) ---
  { key: "general_industry_badge", label: "Industry Badge", section: "General Tracker", tracker: "GENERAL", hasPercent: false },
  { key: "general_genai", label: "Generative & Agentic AI Credential", section: "General Tracker", tracker: "GENERAL", hasPercent: false },
  { key: "general_consulting_academy", label: "Consulting Academy", section: "General Tracker", tracker: "GENERAL", hasPercent: false },
  { key: "general_core_training", label: "2026 IBM Core Training", section: "General Tracker", tracker: "GENERAL", hasPercent: false },
  { key: "general_jrs_upskill", label: "[JR/S in Grow] Upskill", section: "General Tracker", tracker: "GENERAL", hasPercent: false },
  { key: "general_growth_behaviors", label: "IBM Growth Behaviors Badge", section: "General Tracker", tracker: "GENERAL", hasPercent: false },
];

// ---------------------------------------------------------------------------
// 2. Team roster
// ---------------------------------------------------------------------------
type MemberDef = {
  key: string;
  name: string;
  email: string;
  role: Role;
  band: Band;
  yearsAtIbm?: number;
  notes?: string;
};

const members: MemberDef[] = [
  { key: "david", name: "David Villalobos Arguedas", email: "David.Villalobos@ibm.com", role: "PM", band: "EXPERIENCED", yearsAtIbm: 4 },
  { key: "diana", name: "Diana Quesada Castro", email: "dquesada@ibm.com", role: "PM", band: "EXPERIENCED" },
  { key: "federico", name: "Federico Cruz Chaverri", email: "Federico.Cruz.Chaverri@ibm.com", role: "PM", band: "EXPERIENCED", yearsAtIbm: 4 },
  { key: "jerry", name: "Jerry Segura Abarca", email: "jesegura@cr.ibm.com", role: "PM", band: "EXPERIENCED", yearsAtIbm: 11.9 },
  { key: "rodrigo", name: "Rodrigo Chavarria", email: "Rodrigo.Chavarria@ibm.com", role: "PM", band: "EXPERIENCED" },
  { key: "ricardo", name: "Ricardo Lobo", email: "rlobo@ibm.com", role: "PM", band: "EXPERT" },
  { key: "luis", name: "Luis Martin Gomez Gonzalez", email: "Luis.Gomez.G@ibm.com", role: "PM", band: "EXPERT" },
  { key: "javier", name: "Javier Robles Vargas", email: "jarobles@cr.ibm.com", role: "PM", band: "EXPERT" },
  { key: "josepablo", name: "Jose Pablo Alpizar Hernandez", email: "J.Alpizar@ibm.com", role: "PM", band: "EXPERT", yearsAtIbm: 4 },
  { key: "mariana", name: "Mariana Carvajal Barrios", email: "mcarvaja@cr.ibm.com", role: "PM", band: "EXPERT" },
  { key: "celia", name: "Celia Hernandez Vargas", email: "cehernan@cr.ibm.com", role: "BA", band: "FOUNDATION", yearsAtIbm: 10 },
  {
    key: "kender",
    name: "Kender Tate",
    email: "kender.tate@ibm.com",
    role: "BA",
    band: "FOUNDATION",
    notes: "Placeholder work email — update to Ken's real @ibm.com address if different.",
  },
  { key: "nicole", name: "Nicole Perez Gomez", email: "anperez@cr.ibm.com", role: "BA", band: "FOUNDATION", yearsAtIbm: 10 },
  {
    key: "antonio",
    name: "Antonio Lara Otero",
    email: "alara@cr.ibm.com",
    role: "BA",
    band: "EXPERT",
    yearsAtIbm: 10,
    notes:
      "Open discrepancy (flagged 2026-08-10, unresolved): believes Bronze (not Gold) is his real target tier, and his BA Expert Your Learning plan link is broken/retired. His completed/in-progress plans (Reskilling, then Foundations, next Experienced) suggest he may actually be on a Foundation→Experienced track rather than doing Expert-level work yet. Needs a decision from Ken before the Industry Skill and plan-link fields below are trusted.",
  },
  { key: "navit", name: "Navit Viviana Jimenez Calvo", email: "njimenez@cr.ibm.com", role: "BA", band: "EXPERT", yearsAtIbm: 17 },
  { key: "tatiana", name: "Tatiana Pereira Mora", email: "tpereira@cr.ibm.com", role: "BA", band: "EXPERT" },
];

// ---------------------------------------------------------------------------
// 3. Current known progress, by member key -> item key -> { status, percent }
//    Compiled from the Skills Tracker Week 0 / General Tracker Week 0 state
//    and the Slack responses collected as of 2026-08-11. Anything not listed
//    here is left at the default (Not Met / 0%) for the member to fill in.
// ---------------------------------------------------------------------------
type ProgressDef = { status: Status; percent?: number };
const progress: Record<string, Record<string, ProgressDef>> = {
  david: {
    pm_exp_experience: { status: "MET" },
    pm_exp_agile: { status: "MET", percent: 100 },
    pm_exp_itil: { status: "NOT_MET" },
    pm_exp_badge: { status: "NOT_MET" },
    general_genai: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  diana: {
    general_genai: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  federico: {
    pm_exp_experience: { status: "MET" },
    pm_exp_agile: { status: "MET", percent: 100 },
    pm_exp_itil: { status: "NOT_MET" },
    pm_exp_badge: { status: "MET", percent: 100 },
    general_industry_badge: { status: "MET" },
    general_genai: { status: "MET" },
    general_consulting_academy: { status: "IN_PROGRESS" },
    general_core_training: { status: "MET" },
    general_jrs_upskill: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  jerry: {
    pm_exp_experience: { status: "MET" },
    pm_exp_agile: { status: "NOT_MET" },
    pm_exp_itil: { status: "NOT_MET" },
    pm_exp_badge: { status: "NOT_MET" },
    general_industry_badge: { status: "MET" },
    general_genai: { status: "MET" },
    general_consulting_academy: { status: "MET" },
    general_core_training: { status: "MET" },
    general_jrs_upskill: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  rodrigo: {
    general_genai: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  ricardo: {
    general_industry_badge: { status: "NOT_MET" },
    general_genai: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  luis: {
    general_genai: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  javier: {
    general_industry_badge: { status: "MET" },
    general_genai: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  josepablo: {
    pm_expert_experience: { status: "MET" },
    pm_expert_agile: { status: "MET", percent: 100 },
    pm_expert_itil_specialist: { status: "NOT_MET" },
    pm_expert_badge: { status: "NOT_MET" },
    general_industry_badge: { status: "IN_PROGRESS" },
    general_genai: { status: "MET" },
    general_consulting_academy: { status: "IN_PROGRESS" },
    general_core_training: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  mariana: {
    general_genai: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  celia: {
    ba_fnd_industry: { status: "MET", percent: 100 },
    ba_fnd_design_thinking: { status: "MET", percent: 100 },
    general_industry_badge: { status: "MET" },
    general_genai: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  kender: {
    ba_fnd_industry: { status: "MET", percent: 100 },
    ba_fnd_design_thinking: { status: "MET", percent: 100 },
    general_genai: { status: "MET" },
    general_consulting_academy: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  nicole: {
    ba_fnd_industry: { status: "MET", percent: 100 },
    ba_fnd_design_thinking: { status: "MET", percent: 100 },
    general_industry_badge: { status: "MET" },
    general_genai: { status: "MET" },
    general_consulting_academy: { status: "IN_PROGRESS" },
    general_core_training: { status: "MET" },
    general_jrs_upskill: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  antonio: {
    general_consulting_academy: { status: "MET" },
    general_core_training: { status: "MET" },
    general_genai: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  navit: {
    ba_exp_industry: { status: "MET", percent: 100 },
    ba_exp_mentor: { status: "MET", percent: 100 },
    general_industry_badge: { status: "MET" },
    general_genai: { status: "MET" },
    general_consulting_academy: { status: "IN_PROGRESS" },
    general_core_training: { status: "MET" },
    general_jrs_upskill: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
  tatiana: {
    general_industry_badge: { status: "MET" },
    general_genai: { status: "MET" },
    general_growth_behaviors: { status: "MET" },
  },
};

// ---------------------------------------------------------------------------
// 4. Reference links
// ---------------------------------------------------------------------------
const links = [
  { title: "Your Learning – PM Foundation plan", url: "https://yourlearning.ibm.com/activity/PLAN-C6769C35195E", category: "Your Learning plans" },
  { title: "Your Learning – PM Experienced plan", url: "https://yourlearning.ibm.com/activity/PLAN-8ED297F004CE", category: "Your Learning plans" },
  { title: "Your Learning – PM Expert plan", url: "https://yourlearning.ibm.com/activity/PLAN-D5DC6EAD9FD1", category: "Your Learning plans" },
  { title: "Your Learning – BA Foundation plan", url: "https://yourlearning.ibm.com/activity/PLAN-93BBA9A43770", category: "Your Learning plans" },
  { title: "Your Learning – BA Experienced plan", url: "https://yourlearning.ibm.com/activity/PLAN-662CA0878BA6", category: "Your Learning plans" },
  {
    title: "Your Learning – BA Expert plan",
    url: "https://yourlearning.ibm.com/activity/PLAN-653257030793",
    category: "Your Learning plans",
    description: "Flagged by Antonio as broken/retired (2026-08-10) — verify before sharing again.",
  },
  { title: "2026 IBM Core Training", url: "https://yourlearning.ibm.com/activity/PLAN-A1E8D9FFBB8B", category: "Your Learning plans" },
  {
    title: "MyScore (Self Assess JR/S & Skills Proficiency)",
    url: "https://myscore-web-prod.myscore.dal.app.cirrus.ibm.com/services/tools/myscore/metrics",
    category: "Self-check tools",
    description: "Personal login tool — not peer-visible, each person checks their own.",
  },
  { title: "Industry Skills & Badging Roadmap", url: "https://w3.ibm.com/w3publisher/industry-skills-roadmap", category: "Self-check tools" },
  { title: "Consulting Academy", url: "https://w3.ibm.com/services/gbslearn/consultingacademy/prod/#learningpathway", category: "Self-check tools" },
  {
    title: "Generative AI skills space",
    url: "https://w3.ibm.com/services/lighthouse/spaces/view/yourskills/watsonx-generative-ai-for-ibm-consulting",
    category: "Self-check tools",
  },
  { title: "w3 peers entry point (credential checks)", url: "https://w3.ibm.com/#/people/005905659", category: "Reference / backup" },
  {
    title: "Original SharePoint Excel tracker (backup)",
    url: "https://ibm-my.sharepoint.com/:x:/r/personal/jbeckles_ibm_com/_layouts/15/Doc.aspx?sourcedoc=%7Bee4de269-20a7-40eb-8912-8205d5dcf4fa%7D",
    category: "Reference / backup",
  },
];

async function main() {
  console.log("Seeding skill items...");
  for (const [i, item] of items.entries()) {
    await prisma.skillItem.upsert({
      where: { key: item.key },
      update: {
        label: item.label,
        section: item.section,
        tracker: item.tracker,
        role: item.role ?? null,
        band: item.band ?? null,
        hasPercent: item.hasPercent ?? true,
        optional: item.optional ?? false,
        helpText: item.helpText,
        displayOrder: i,
      },
      create: {
        key: item.key,
        label: item.label,
        section: item.section,
        tracker: item.tracker,
        role: item.role ?? null,
        band: item.band ?? null,
        hasPercent: item.hasPercent ?? true,
        optional: item.optional ?? false,
        helpText: item.helpText,
        displayOrder: i,
      },
    });
  }

  console.log("Seeding members + progress...");
  for (const m of members) {
    const member = await prisma.member.upsert({
      where: { email: m.email },
      update: {
        name: m.name,
        role: m.role,
        band: m.band,
        yearsAtIbm: m.yearsAtIbm,
        notes: m.notes,
      },
      create: {
        name: m.name,
        email: m.email,
        role: m.role,
        band: m.band,
        yearsAtIbm: m.yearsAtIbm,
        notes: m.notes,
      },
    });

    const applicableItems = items.filter(
      (it) => (it.role === undefined || it.role === m.role) && (it.band === undefined || it.band === m.band)
    );
    const memberProgress = progress[m.key] ?? {};

    for (const it of applicableItems) {
      const p = memberProgress[it.key];
      const skillItem = await prisma.skillItem.findUniqueOrThrow({ where: { key: it.key } });
      await prisma.progress.upsert({
        where: { memberId_skillItemId: { memberId: member.id, skillItemId: skillItem.id } },
        update: p ? { status: p.status, percent: p.percent ?? (p.status === "MET" ? 100 : 0) } : {},
        create: {
          memberId: member.id,
          skillItemId: skillItem.id,
          status: p?.status ?? "NOT_MET",
          percent: p?.percent ?? (p?.status === "MET" ? 100 : 0),
        },
      });
    }
  }

  console.log("Seeding links...");
  const existingLinks = await prisma.linkResource.count();
  if (existingLinks === 0) {
    for (const [i, link] of links.entries()) {
      await prisma.linkResource.create({
        data: { ...link, displayOrder: i },
      });
    }
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
