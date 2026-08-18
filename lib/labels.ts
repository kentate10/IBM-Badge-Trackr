import type { Band, Role, Status } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  PM: "Project Manager",
  BA: "Business Analyst",
};

export const BAND_LABELS: Record<Band, string> = {
  FOUNDATION: "Foundation",
  EXPERIENCED: "Experienced",
  EXPERT: "Expert",
};

export const STATUS_LABELS: Record<Status, string> = {
  MET: "Met",
  NOT_MET: "Not Met",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  EXPIRED: "Expired",
};

export const STATUS_ORDER: Status[] = ["MET", "IN_PROGRESS", "BLOCKED", "EXPIRED", "NOT_MET"];

// Tailwind classes per status, reused across badges, table cells and charts.
export const STATUS_STYLES: Record<Status, { bg: string; text: string; dot: string; hex: string }> = {
  MET: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", hex: "#10b981" },
  IN_PROGRESS: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", hex: "#f59e0b" },
  BLOCKED: { bg: "bg-orange-50", text: "text-orange-800", dot: "bg-orange-600", hex: "#ea580c" },
  EXPIRED: { bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500", hex: "#8b5cf6" },
  NOT_MET: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", hex: "#f43f5e" },
};

export function roleBandLabel(role: Role, band: Band) {
  return `${ROLE_LABELS[role]} · ${BAND_LABELS[band]}`;
}

// SkillItem keys that represent a credential which can lapse after being
// earned (renewal-based certs), as opposed to a badge that, once earned,
// doesn't expire. The Status "Expired" option is only offered in editable
// dropdowns for these keys — every other item keeps the original 4-option
// list. Display (StatusBadge, charts, exports) still renders Expired
// generically wherever it's the stored value, in case this list grows.
// 2026-08-18, Ken's ask: add Expired for the ITIL certification tracking.
export const EXPIRABLE_ITEM_KEYS = new Set<string>(["pm_exp_itil", "pm_expert_itil_specialist"]);

// Status options to offer in an editable dropdown for a given SkillItem key.
export function statusOptionsForKey(key: string): Status[] {
  return EXPIRABLE_ITEM_KEYS.has(key) ? STATUS_ORDER : STATUS_ORDER.filter((s) => s !== "EXPIRED");
}
