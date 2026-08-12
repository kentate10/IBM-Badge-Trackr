// ISO-8601 week numbering (Monday-start weeks, week 1 = week containing the
// first Thursday of the year). Used so "guardar snapshot" defaults to a
// label like "Semana 33 · 2026" instead of a plain date, matching how the
// team thinks about weekly check-ins.
export function isoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `Semana ${weekNo} · ${d.getUTCFullYear()}`;
}
