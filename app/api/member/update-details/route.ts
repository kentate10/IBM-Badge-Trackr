import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Admin-only: edits a member's basic profile fields (name, email,
// slackHandle, yearsAtIbm, isManager). Deliberately separate from
// update-role/route.ts (role/band), which has its own specific "this changes
// what fields this person sees" warning copy and is left untouched — this
// route is the plainer "fix a typo / update years at IBM" editor.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const memberId = (body as { memberId?: unknown })?.memberId;
  const name = (body as { name?: unknown })?.name;
  const email = (body as { email?: unknown })?.email;
  const slackHandleRaw = (body as { slackHandle?: unknown })?.slackHandle;
  const yearsAtIbmRaw = (body as { yearsAtIbm?: unknown })?.yearsAtIbm;
  const isManagerRaw = (body as { isManager?: unknown })?.isManager;

  if (
    typeof memberId !== "string" ||
    typeof name !== "string" ||
    name.trim().length === 0 ||
    typeof email !== "string" ||
    !email.includes("@") ||
    typeof isManagerRaw !== "boolean"
  ) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const slackHandle =
    typeof slackHandleRaw === "string" && slackHandleRaw.trim().length > 0 ? slackHandleRaw.trim() : null;

  let yearsAtIbm: number | null = null;
  if (yearsAtIbmRaw !== null && yearsAtIbmRaw !== undefined && yearsAtIbmRaw !== "") {
    const n = Number(yearsAtIbmRaw);
    if (Number.isNaN(n) || n < 0) {
      return NextResponse.json({ error: "Años en IBM inválido" }, { status: 400 });
    }
    yearsAtIbm = n;
  }

  const existing = await prisma.member.findUnique({ where: { id: memberId } });
  if (!existing) {
    return NextResponse.json({ error: "Miembro no encontrado" }, { status: 404 });
  }

  try {
    const member = await prisma.member.update({
      where: { id: memberId },
      data: { name: name.trim(), email: email.trim(), slackHandle, yearsAtIbm, isManager: isManagerRaw },
    });
    return NextResponse.json({ ok: true, member });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Ese email ya está en uso por otra persona" }, { status: 409 });
    }
    throw err;
  }
}
