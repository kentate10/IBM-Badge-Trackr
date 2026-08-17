import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SCOPE_KEY_PREFIX } from "@/lib/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function setColumnWidths(sheet: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
}

// Admin-only full data export. One workbook, five sheets: a sortable
// team summary, the full per-member x per-item detail (the raw equivalent
// of the old Excel workbook), the weekly team history, weekly history per
// person, and the links directory — everything the tracker holds.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const [members, items, allProgress, snapshots, weeklySnapshots, links] = await Promise.all([
    prisma.member.findMany({ orderBy: { name: "asc" } }),
    // Scope-only items are excluded — this export mirrors the original Excel
    // workbook's two tabs, not the separate Scope view. See lib/scope.ts.
    prisma.skillItem.findMany({
      where: { NOT: { key: { startsWith: SCOPE_KEY_PREFIX } } },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.progress.findMany(),
    prisma.snapshot.findMany({ orderBy: { takenAt: "asc" }, include: { member: true } }),
    prisma.weeklySnapshot.findMany({ orderBy: { takenAt: "asc" } }),
    prisma.linkResource.findMany({ orderBy: [{ category: "asc" }, { displayOrder: "asc" }] }),
  ]);

  const progressByMember = new Map<string, typeof allProgress>();
  for (const p of allProgress) {
    if (!progressByMember.has(p.memberId)) progressByMember.set(p.memberId, []);
    progressByMember.get(p.memberId)!.push(p);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Badge Acceleration Tracker";
  workbook.created = new Date();

  // --- Resumen ---
  const summarySheet = workbook.addWorksheet("Resumen");
  summarySheet.addRow(["Badge Acceleration — Resumen del equipo"]);
  summarySheet.addRow([`Generado: ${new Date().toLocaleString("es-CR")}`]);
  summarySheet.addRow([]);
  summarySheet.addRow(["Nombre", "Rol", "Banda", "Años en IBM", "% completado", "Cumplidos", "Total"]).font = { bold: true };

  const summaryRows = members
    .map((member) => {
      const applicable = items.filter(
        (it) => (it.role === null || it.role === member.role) && (it.band === null || it.band === member.band)
      );
      const progByItemId = new Map((progressByMember.get(member.id) ?? []).map((p) => [p.skillItemId, p]));
      const met = applicable.filter((it) => (progByItemId.get(it.id)?.status ?? "NOT_MET") === "MET").length;
      const pct = applicable.length ? Math.round((met / applicable.length) * 1000) / 10 : 0;
      return { member, pct, met, total: applicable.length };
    })
    .sort((a, b) => b.pct - a.pct);

  for (const r of summaryRows) {
    summarySheet.addRow([r.member.name, r.member.role, r.member.band, r.member.yearsAtIbm ?? "", r.pct, r.met, r.total]);
  }
  setColumnWidths(summarySheet, [26, 12, 14, 14, 14, 12, 10]);

  // --- Detalle por persona (raw per-item rows, one per member x applicable item) ---
  const detailSheet = workbook.addWorksheet("Detalle por persona");
  detailSheet.addRow(["Nombre", "Rol", "Banda", "Sección", "Campo", "Status", "Porcentaje", "Notas"]).font = { bold: true };
  for (const member of members) {
    const applicable = items.filter(
      (it) => (it.role === null || it.role === member.role) && (it.band === null || it.band === member.band)
    );
    const progByItemId = new Map((progressByMember.get(member.id) ?? []).map((p) => [p.skillItemId, p]));
    for (const item of applicable) {
      const p = progByItemId.get(item.id);
      detailSheet.addRow([
        member.name,
        member.role,
        member.band,
        item.section,
        item.label,
        p?.status ?? "NOT_MET",
        p?.percent ?? 0,
        p?.notes ?? "",
      ]);
    }
  }
  setColumnWidths(detailSheet, [26, 10, 14, 22, 40, 12, 12, 30]);

  // --- Historial semanal (equipo) ---
  const historySheet = workbook.addWorksheet("Historial semanal");
  historySheet.addRow(["Semana", "Fecha", "% Equipo"]).font = { bold: true };
  for (const w of weeklySnapshots) {
    historySheet.addRow([w.label, w.takenAt.toLocaleDateString("es-CR"), w.teamPercent]);
  }
  setColumnWidths(historySheet, [22, 18, 12]);

  // --- Historial por persona ---
  const perPersonHistorySheet = workbook.addWorksheet("Historial por persona");
  perPersonHistorySheet.addRow(["Semana", "Fecha", "Nombre", "% completado", "Cumplidos", "Total"]).font = { bold: true };
  for (const s of snapshots) {
    perPersonHistorySheet.addRow([s.label, s.takenAt.toLocaleDateString("es-CR"), s.member.name, s.percentComplete, s.metCount, s.totalCount]);
  }
  setColumnWidths(perPersonHistorySheet, [22, 18, 26, 14, 12, 10]);

  // --- Enlaces ---
  const linksSheet = workbook.addWorksheet("Enlaces");
  linksSheet.addRow(["Categoría", "Título", "URL", "Descripción"]).font = { bold: true };
  for (const l of links) {
    linksSheet.addRow([l.category, l.title, l.url, l.description ?? ""]);
  }
  setColumnWidths(linksSheet, [20, 30, 40, 40]);

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `badge-acceleration-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
