import type { Band } from "@prisma/client";

// The "Scope" tab (added 2026-08-17) is a deliberately reduced, priority-only
// VIEW: same roster, same underlying data as the rest of the tracker, just
// fewer columns. The two reference screenshots Ken supplied only define
// WHICH categories are in scope — Ken confirmed 2026-08-17 that the Met/
// Pending values shown in those screenshots were sample/mockup data with no
// real validity, and that the real source of truth is the Excel workbook and
// the rest of this app (Panel, Por requerimiento). Corrected accordingly:
// every Scope column reuses an EXISTING, already-tracked SkillItem (or, for
// "Thought Leadership", aggregates a few existing ones) — nothing here is a
// fresh, independently-tracked field that could drift out of sync with the
// real data the way the first version's tiered Industry Badge items did.
export const SCOPE_KEY_PREFIX = "scope_";

export type ScopeColumn = {
  label: string;
  // Missing band = column doesn't apply to that band (rendered as N/A).
  // Editable, single-item columns (most of them): one real SkillItem key per
  // band, click-to-manage same as everywhere else in the app.
  keysByBand: Partial<Record<Band, string>>;
  // Read-only, computed columns (currently only Thought Leadership): shows
  // the best status among several real SkillItem keys. Not directly
  // editable here — edit the specific badge on "Por requerimiento" instead,
  // since there's no single field to write an edit back to.
  aggregateKeysByBand?: Partial<Record<Band, string[]>>;
};

export function scopeKeyForBand(col: ScopeColumn, band: Band): string | null {
  return col.keysByBand[band] ?? null;
}

// PM roster columns, per the "PM Roster & Certification Status" screenshot
// (2026-08-17): Scrum Master, Industry Badge, IBM PM Badge, ITIL (On Hold —
// matches the existing optional/reference-only treatment, just relabeled).
// Industry Badge reuses the real, already-verified `general_industry_badge`
// field (same one "Por requerimiento" and the General Tracker use) — the
// original version invented separate Silver/Gold-tiered items seeded blank,
// which is what caused everyone to show up as not-met here while the real
// field already showed most people Met. Corrected 2026-08-17.
export const PM_SCOPE_COLUMNS: ScopeColumn[] = [
  { label: "Scrum Master", keysByBand: { EXPERIENCED: "pm_exp_agile", EXPERT: "pm_expert_agile" } },
  { label: "Industry Badge", keysByBand: { EXPERIENCED: "general_industry_badge", EXPERT: "general_industry_badge" } },
  { label: "IBM PM Badge", keysByBand: { EXPERIENCED: "pm_exp_badge", EXPERT: "pm_expert_badge" } },
  { label: "ITIL (On Hold)", keysByBand: { EXPERIENCED: "pm_exp_itil", EXPERT: "pm_expert_itil_specialist" } },
];

// BA roster columns, per the "BA Roster & Certification Status" screenshot
// (2026-08-17): Industry Skill, Design Thinking, IBM Mentor (Expert only),
// Thought Leadership (Expert only). Thought Leadership has no single
// existing field — it's shown as a read-only aggregate (best status) of the
// 4 existing "choose 1" badges (IC/Property, Speaker/Presenter,
// Teacher/Educator, Profession Champion) so it can never drift from the real
// data the way an independent blank field would.
export const BA_SCOPE_COLUMNS: ScopeColumn[] = [
  { label: "Industry Skill", keysByBand: { FOUNDATION: "ba_fnd_industry", EXPERT: "ba_exp_industry" } },
  {
    label: "Design Thinking",
    keysByBand: { FOUNDATION: "ba_fnd_design_thinking", EXPERT: "ba_exp_design_thinking_cocreator" },
  },
  { label: "IBM Mentor", keysByBand: { EXPERT: "ba_exp_mentor" } },
  {
    label: "Thought Leadership",
    keysByBand: {},
    aggregateKeysByBand: {
      EXPERT: ["ba_exp_ic_property", "ba_exp_speaker", "ba_exp_teacher", "ba_exp_champion"],
    },
  },
];

// No Scope-only SkillItems anymore as of the 2026-08-17 fix (see above) —
// every column now reuses real, already-tracked items. Left as an empty
// array (rather than removed) so app/api/debug/run-update/route.ts's
// ensure-loop keeps compiling unchanged; it's a harmless no-op now.
// Note: 3 now-unused rows (scope_pm_exp_industry, scope_pm_expert_industry,
// scope_ba_exp_thought_leadership) from the first version are still sitting
// in the production database, inert — nothing reads or writes them anymore
// since they're not referenced by any column above. Left in place rather
// than spending another deploy cycle deleting them; harmless either way.
export const SCOPE_ONLY_ITEMS: {
  key: string;
  label: string;
  section: string;
  tracker: "SKILLS" | "GENERAL";
  role: "PM" | "BA";
  band: "FOUNDATION" | "EXPERIENCED" | "EXPERT";
  hasPercent: boolean;
}[] = [];
