import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Status } from "@prisma/client";
import { ROLE_LABELS, BAND_LABELS } from "@/lib/labels";
import { SCOPE_KEY_PREFIX } from "@/lib/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PDFDoc = InstanceType<typeof PDFDocument>;
type Col = { header: string; key: string; width: number };

// Hand-rolled table renderer: pdfkit has no built-in table support. Draws a
// bold header row + underline, then each data row, breaking to a new page
// (and re-drawing the header) whenever the next row would run past the
// bottom margin. Returns the y position after the last row so the caller
// can keep stacking sections below it.
function drawTable(doc: PDFDoc, opts: { x: number; startY: number; columns: Col[]; rows: Record<string, string | number>[] }): number {
  const { x, columns, rows } = opts;
  const rowHeight = 18;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  let y = opts.startY;

  function drawHeader() {
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#334155");
    let cx = x;
    for (const col of columns) {
      doc.text(col.header, cx, y, { width: col.width, ellipsis: true });
      cx += col.width;
    }
    y += rowHeight;
    doc
      .moveTo(x, y - 4)
      .lineTo(x + columns.reduce((s, c) => s + c.width, 0), y - 4)
      .strokeColor("#cbd5e1")
      .stroke();
    doc.font("Helvetica").fontSize(9).fillColor("#0f172a");
  }

  drawHeader();
  for (const row of rows) {
    if (y + rowHeight > bottomLimit) {
      doc.addPage();
      y = doc.page.margins.top;
      drawHeader();
    }
    let cx = x;
    for (const col of columns) {
      doc.text(String(row[col.key] ?? ""), cx, y, { width: col.width, ellipsis: true });
      cx += col.width;
    }
    y += rowHeight;
  }
  return y;
}

function renderPdf(data: {
  teamPct: number;
  at100: number;
  below50: number;
  totalMembers: number;
  memberRows: { name: string; roleBand: string; pct: number; met: number; total: number }[];
  sectionRows: { name: string; met: number; inProgress: number; blocked: number; expired: number; notMet: number }[];
  weeklySnapshots: { label: string; takenAt: Date; teamPercent: number }[];
}): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;

    doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f172a").text("Badge Acceleration — Reporte del equipo");
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64748b")
      .text(`Generado: ${new Date().toLocaleString("es-CR")}`);
    doc.fillColor("#0f172a");
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(12).text("Resumen", left, doc.y);
    doc.font("Helvetica").fontSize(10).moveDown(0.3);
    doc.text(`Avance del equipo: ${data.teamPct}%`);
    doc.text(`Personas al 100%: ${data.at100} / ${data.totalMembers}`);
    doc.text(`Personas por debajo de 50%: ${data.below50}`);
    doc.text(`Snapshots guardados: ${data.weeklySnapshots.length}`);
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(12).text("Avance por persona", left, doc.y);
    doc.moveDown(0.3);
    let y = drawTable(doc, {
      x: left,
      startY: doc.y,
      columns: [
        { header: "Nombre", key: "name", width: 150 },
        { header: "Rol / Banda", key: "roleBand", width: 160 },
        { header: "%", key: "pct", width: 50 },
        { header: "Cumplidos", key: "metTotal", width: 100 },
      ],
      rows: data.memberRows.map((m) => ({
        name: m.name,
        roleBand: m.roleBand,
        pct: `${m.pct}%`,
        metTotal: `${m.met} / ${m.total}`,
      })),
    });

    doc.y = y + 16;
    doc.font("Helvetica-Bold").fontSize(12).text("Avance por sección", left, doc.y);
    doc.moveDown(0.3);
    y = drawTable(doc, {
      x: left,
      startY: doc.y,
      columns: [
        { header: "Sección", key: "name", width: 170 },
        { header: "Met", key: "met", width: 55 },
        { header: "In Progress", key: "inProgress", width: 75 },
        { header: "Blocked", key: "blocked", width: 60 },
        { header: "Expired", key: "expired", width: 60 },
        { header: "Not Met", key: "notMet", width: 60 },
      ],
      rows: data.sectionRows,
    });

    if (data.weeklySnapshots.length > 0) {
      doc.y = y + 16;
      doc.font("Helvetica-Bold").fontSize(12).text("Historial semanal", left, doc.y);
      doc.moveDown(0.3);
      drawTable(doc, {
        x: left,
        startY: doc.y,
        columns: [
          { header: "Semana", key: "label", width: 180 },
          { header: "Fecha", key: "date", width: 120 },
          { header: "% Equipo", key: "pct", width: 100 },
        ],
        rows: data.weeklySnapshots.map((w) => ({
          label: w.label,
          date: w.takenAt.toLocaleDateString("es-CR"),
          pct: `${Math.round(w.teamPercent)}%`,
        })),
      });
    }

    doc.end();
  });
}

// Admin-only. A readable summary report (team stats, per-person %, per-section
// breakdown, weekly history) — the printable counterpart to the full raw-data
// Excel export, which carries the per-item detail this format isn't suited for.
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const [members, items, allProgress, weeklySnapshots] = await Promise.all([
    prisma.member.findMany({ orderBy: { name: "asc" } }),
    // Scope-only items are excluded — see lib/scope.ts.
    prisma.skillItem.findMany({ where: { NOT: { key: { startsWith: SCOPE_KEY_PREFIX } } } }),
    prisma.progress.findMany(),
    prisma.weeklySnapshot.findMany({ orderBy: { takenAt: "asc" } }),
  ]);

  const progressByMember = new Map<string, typeof allProgress>();
  for (const p of allProgress) {
    if (!progressByMember.has(p.memberId)) progressByMember.set(p.memberId, []);
    progressByMember.get(p.memberId)!.push(p);
  }

  const statusCounts: Record<Status, number> = { MET: 0, NOT_MET: 0, IN_PROGRESS: 0, BLOCKED: 0, EXPIRED: 0 };
  const sectionCounts = new Map<string, Record<Status, number>>();
  const memberRows: { name: string; roleBand: string; pct: number; met: number; total: number }[] = [];

  for (const member of members) {
    const applicable = items.filter(
      (it) => (it.role === null || it.role === member.role) && (it.band === null || it.band === member.band)
    );
    const progByItemId = new Map((progressByMember.get(member.id) ?? []).map((p) => [p.skillItemId, p]));
    let met = 0;
    for (const item of applicable) {
      const status: Status = progByItemId.get(item.id)?.status ?? "NOT_MET";
      statusCounts[status] += 1;
      if (status === "MET") met += 1;
      if (!sectionCounts.has(item.section)) {
        sectionCounts.set(item.section, { MET: 0, NOT_MET: 0, IN_PROGRESS: 0, BLOCKED: 0, EXPIRED: 0 });
      }
      sectionCounts.get(item.section)![status] += 1;
    }
    memberRows.push({
      name: member.name,
      roleBand: `${ROLE_LABELS[member.role]} · ${BAND_LABELS[member.band]}`,
      pct: applicable.length ? Math.round((met / applicable.length) * 100) : 0,
      met,
      total: applicable.length,
    });
  }
  memberRows.sort((a, b) => b.pct - a.pct);

  const teamTotal = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const teamPct = teamTotal ? Math.round((statusCounts.MET / teamTotal) * 100) : 0;
  const at100 = memberRows.filter((m) => m.pct === 100).length;
  const below50 = memberRows.filter((m) => m.pct < 50).length;

  const sectionRows = [...sectionCounts.entries()]
    .map(([name, c]) => ({ name, met: c.MET, inProgress: c.IN_PROGRESS, blocked: c.BLOCKED, expired: c.EXPIRED, notMet: c.NOT_MET }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const buffer = await renderPdf({
    teamPct,
    at100,
    below50,
    totalMembers: members.length,
    memberRows,
    sectionRows,
    weeklySnapshots,
  });

  const filename = `badge-acceleration-${new Date().toISOString().slice(0, 10)}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
