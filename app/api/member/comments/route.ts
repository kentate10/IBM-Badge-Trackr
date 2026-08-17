import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Admin-only, like update-role and update-details: comments are an internal
// tracking tool (Slack replies, flags, "pendiente confirmar con X"), so only
// admins write them. Everyone with access to a profile can read them — see
// MemberComments.tsx, which fetches via the server component, not this route.
async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return { ok: false as const, res: NextResponse.json({ error: "Solo administradores" }, { status: 403 }) };
  }
  return { ok: true as const };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const memberId = (body as { memberId?: unknown })?.memberId;
  const text = (body as { body?: unknown })?.body;
  const authorRaw = (body as { author?: unknown })?.author;

  if (typeof memberId !== "string" || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  const author = typeof authorRaw === "string" && authorRaw.trim().length > 0 ? authorRaw.trim() : null;

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: { memberId, body: text.trim(), author },
  });

  return NextResponse.json({ ok: true, comment });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const commentId = (body as { commentId?: unknown })?.commentId;
  if (typeof commentId !== "string") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  await prisma.comment.delete({ where: { id: commentId } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
