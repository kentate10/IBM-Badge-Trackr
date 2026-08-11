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
};

export const STATUS_ORDER: Status[] = ["MET", "IN_PROGRESS", "BLOCKED", "NOT_MET"];

// Tailwind classes per status, reused across badges, table cells and charts.
export const STATUS_STYLES: Record<Status, { bg: string; text: string; dot: string; hex: string }> = {
  MET: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", hex: "#10b981" },
  IN_PROGRESS: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", hex: "#f59e0b" },
  BLOCKED: { bg: "bg-orange-50", text: "text-orange-800", dot: "bg-orange-600", hex: "#ea580c" },
  NOT_MET: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", hex: "#f43f5e" },
};

export function roleBandLabel(role: Role, band: Band) {
  return `${ROLE_LABELS[role]} · ${BAND_LABELS[band]}`;
}
