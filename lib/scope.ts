import type { Band } from "@prisma/client";

// The "Scope" tab (added 2026-08-17) is a deliberately reduced, priority-only
// view: same roster as the full tracker, but only the specific requirement
// columns leadership flagged as priority (two reference screenshots — PM
// roster and BA roster — supplied by Ken). It's additive and isolated from
// the full Skills/General trackers: existing SkillItem keys are reused where
// there's a direct match, and every SkillItem that exists ONLY for this view
// is prefixed with SCOPE_KEY_PREFIX so it can be filtered out everywhere else
// (main panel, by-item, member checklist, snapshots, exports) with one check.
export const SCOPE_KEY_PREFIX = "scope_";

export type ScopeColumn = {
  label: string;
  // Missing band = column doesn't apply to that band (rendered as N/A).
  keysByBand: Partial<Record<Band, string>>;
};

export function scopeKeyForBand(col: ScopeColumn, band: Band): string | null {
  return col.keysByBand[band] ?? null;
}

// PM roster columns, per the "PM Roster & Certification Status" screenshot
// (2026-08-17): Scrum Master, Industry Badge (Silver for Experienced / Gold
// for Expert — a stricter, tiered requirement than the untiered General
// Tracker "Industry badge" column), IBM PM Badge, ITIL (On Hold — matches
// the existing optional/reference-only treatment, just relabeled).
export const PM_SCOPE_COLUMNS: ScopeColumn[] = [
  { label: "Scrum Master", keysByBand: { EXPERIENCED: "pm_exp_agile", EXPERT: "pm_expert_agile" } },
  {
    label: "Industry Badge",
    keysByBand: { EXPERIENCED: "scope_pm_exp_industry", EXPERT: "scope_pm_expert_industry" },
  },
  { label: "IBM PM Badge", keysByBand: { EXPERIENCED: "pm_exp_badge", EXPERT: "pm_expert_badge" } },
  { label: "ITIL (On Hold)", keysByBand: { EXPERIENCED: "pm_exp_itil", EXPERT: "pm_expert_itil_specialist" } },
];

// BA roster columns, per the "BA Roster & Certification Status" screenshot
// (2026-08-17): Industry Skill, Design Thinking, IBM Mentor (Expert only),
// Thought Leadership (Expert only — consolidates the 4 existing "choose 1"
// badges — IC/Property, Speaker/Presenter, Teacher/Educator, Profession
// Champion — into one tracked column, matching how the screenshot shows it
// as a single field rather than 4 separate ones).
export const BA_SCOPE_COLUMNS: ScopeColumn[] = [
  { label: "Industry Skill", keysByBand: { FOUNDATION: "ba_fnd_industry", EXPERT: "ba_exp_industry" } },
  {
    label: "Design Thinking",
    keysByBand: { FOUNDATION: "ba_fnd_design_thinking", EXPERT: "ba_exp_design_thinking_cocreator" },
  },
  { label: "IBM Mentor", keysByBand: { EXPERT: "ba_exp_mentor" } },
  { label: "Thought Leadership", keysByBand: { EXPERT: "scope_ba_exp_thought_leadership" } },
];

// The 3 SkillItem keys that don't already exist elsewhere in the tracker and
// need to be created once (see app/api/debug/run-update/route.ts) before this
// tab has anything to read/write for them.
export const SCOPE_ONLY_ITEMS = [
  {
    key: "scope_pm_exp_industry",
    label: "Industry Badge (Silver)",
    section: "PM Experienced",
    tracker: "GENERAL" as const,
    role: "PM" as const,
    band: "EXPERIENCED" as const,
    hasPercent: true,
  },
  {
    key: "scope_pm_expert_industry",
    label: "Industry Badge (Gold)",
    section: "PM Expert",
    tracker: "GENERAL" as const,
    role: "PM" as const,
    band: "EXPERT" as const,
    hasPercent: true,
  },
  {
    key: "scope_ba_exp_thought_leadership",
    label: "Thought Leadership",
    section: "BA Expert",
    tracker: "GENERAL" as const,
    role: "BA" as const,
    band: "EXPERT" as const,
    hasPercent: true,
  },
];
