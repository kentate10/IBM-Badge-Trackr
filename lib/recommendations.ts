import type { Status } from "@prisma/client";
import type { SectionBarDatum } from "@/components/charts/SectionBarChart";

export type Recommendation = {
  severity: "high" | "medium" | "info";
  title: string;
  detail: string;
};

type MemberRow = { id: string; name: string; pct: number; met: number; total: number };

const SEVERITY_RANK: Record<Recommendation["severity"], number> = { high: 0, medium: 1, info: 2 };

// Rule-based recommendations derived from whatever slice of data the admin
// panel is currently showing (live or a specific saved week). No ML here —
// just the checks a lead would eyeball the dashboard for anyway, automated
// so they don't get missed.
export function buildRecommendations(params: {
  memberPct: MemberRow[];
  sectionData: SectionBarDatum[];
  statusCounts: Record<Status, number>;
  teamPct: number;
  trend?: { label: string; Equipo: number }[];
}): Recommendation[] {
  const { memberPct, sectionData, statusCounts, teamPct, trend } = params;
  const recs: Recommendation[] = [];

  const zero = memberPct.filter((m) => m.pct === 0);
  if (zero.length > 0) {
    recs.push({
      severity: "high",
      title: zero.length === 1 ? "1 persona no ha iniciado" : `${zero.length} personas no han iniciado`,
      detail: `${zero.map((m) => m.name).join(", ")} — vale la pena un kickoff 1:1 para arrancar el checklist.`,
    });
  }

  const low = memberPct.filter((m) => m.pct > 0 && m.pct < 50);
  if (low.length > 0) {
    recs.push({
      severity: "medium",
      title: `${low.length} ${low.length === 1 ? "persona está" : "personas están"} por debajo del 50%`,
      detail: `${low.map((m) => m.name).join(", ")} — revisá con cada uno qué está frenando el avance.`,
    });
  }

  const blockedTotal = statusCounts.BLOCKED ?? 0;
  if (blockedTotal > 0) {
    const worstSection = [...sectionData].sort((a, b) => b.blocked - a.blocked)[0];
    recs.push({
      severity: "high",
      title: `${blockedTotal} ${blockedTotal === 1 ? "campo bloqueado" : "campos bloqueados"} en el equipo`,
      detail:
        worstSection && worstSection.blocked > 0
          ? `La sección "${worstSection.name}" concentra ${worstSection.blocked}. Conviene escalarlo o desbloquearlo en el próximo 1:1.`
          : "Revisá con el equipo qué está bloqueando esos campos.",
    });
  }

  const withRatio = sectionData
    .map((s) => {
      const total = s.met + s.inProgress + s.blocked + s.notMet;
      return { ...s, total, notMetRatio: total > 0 ? s.notMet / total : 0 };
    })
    .filter((s) => s.total >= 3);
  const gap = [...withRatio].sort((a, b) => b.notMetRatio - a.notMetRatio)[0];
  if (gap && gap.notMetRatio >= 0.5) {
    recs.push({
      severity: "medium",
      title: `"${gap.name}" es la sección con más rezago`,
      detail: `${Math.round(gap.notMetRatio * 100)}% de ese contenido sigue en Not Met. Podría valer un taller o sesión grupal enfocada en ese tema.`,
    });
  }

  if (trend && trend.length >= 2) {
    const last = trend[trend.length - 1].Equipo;
    const prev = trend[trend.length - 2].Equipo;
    if (last <= prev) {
      recs.push({
        severity: last < prev ? "high" : "medium",
        title:
          last < prev
            ? "El avance del equipo bajó respecto al snapshot anterior"
            : "El avance del equipo no se movió desde el snapshot anterior",
        detail: `${prev}% → ${last}%. Vale la pena revisar si hay bloqueos nuevos o si el equipo necesita tiempo protegido para avanzar.`,
      });
    }
  }

  const almostDone = memberPct.filter((m) => m.pct >= 90 && m.pct < 100);
  if (almostDone.length > 0) {
    recs.push({
      severity: "info",
      title: `${almostDone.length} ${almostDone.length === 1 ? "persona está" : "personas están"} a un paso del 100%`,
      detail: `${almostDone.map((m) => m.name).join(", ")} — un empujón chiquito y cierran el checklist completo.`,
    });
  }

  if (recs.length === 0) {
    recs.push({
      severity: "info",
      title: "Sin alertas por ahora",
      detail: `El equipo está en ${teamPct}% con avance parejo y sin bloqueos activos. Buen momento para guardar snapshot y seguir el ritmo.`,
    });
  }

  return recs.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
