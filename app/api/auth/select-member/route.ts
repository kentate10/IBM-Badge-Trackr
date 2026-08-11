import { NextRequest, NextResponse } from "next/server";
import { getSession, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const memberId = (body as { memberId?: unknown })?.memberId;
  if (typeof memberId !== "string") {
    return NextResponse.json({ error: "memberId requerido" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  await setSessionCookie({ role: session.role, memberId: member.id });
  return NextResponse.json({ ok: true, memberId: member.id });
}
