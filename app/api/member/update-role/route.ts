import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role, Band } from "@prisma/client";

const VALID_ROLES: Role[] = ["PM", "BA"];
const VALID_BANDS: Band[] = ["FOUNDATION", "EXPERIENCED", "EXPERT"];

// Admin-only: reassigns a member's role/band (e.g. BA Foundation -> PM Expert
// after an internal move). Progress rows for items that no longer apply are
// left in place (just filtered out of view) rather than deleted, so nothing
// is lost if the change gets reverted later.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const memberId = (body as { memberId?: unknown })?.memberId;
  const role = (body as { role?: unknown })?.role;
  const band = (body as { band?: unknown })?.band;

  if (
    typeof memberId !== "string" ||
    typeof role !== "string" ||
    typeof band !== "string" ||
    !VALID_ROLES.includes(role as Role) ||
    !VALID_BANDS.includes(band as Band)
  ) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const existing = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existing) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  const member = await prisma.member.update({
    where: { id: memberId },
    data: { role: role as Role, band: band as Band },
  });

  return NextResponse.json({ ok: true, member: { id: member.id, role: member.role, band: member.band } });
}
