import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Status } from "@prisma/client";

const VALID_STATUSES: Status[] = ["MET", "NOT_MET", "IN_PROGRESS", "BLOCKED"];

type UpdateBody = {
  memberId: string;
  updates: { skillItemId: string; status: Status; percent: number }[];
};

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as UpdateBody | null;
  if (!body || typeof body.memberId !== "string" || !Array.isArray(body.updates)) {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  // Members may only edit their own row; admins may edit anyone.
  if (session.role === "member" && session.memberId !== body.memberId) {
    return NextResponse.json({ error: "No autorizado para editar este miembro" }, { status: 403 });
  }

  for (const u of body.updates) {
    if (typeof u.skillItemId !== "string" || !VALID_STATUSES.includes(u.status)) {
      return NextResponse.json({ error: "Actualización inválida" }, { status: 400 });
    }
  }

  const results = await prisma.$transaction(
    body.updates.map((u) =>
      prisma.progress.upsert({
        where: { memberId_skillItemId: { memberId: body.memberId, skillItemId: u.skillItemId } },
        update: { status: u.status, percent: Math.max(0, Math.min(100, Math.round(u.percent))) },
        create: {
          memberId: body.memberId,
          skillItemId: u.skillItemId,
          status: u.status,
          percent: Math.max(0, Math.min(100, Math.round(u.percent))),
        },
      })
    )
  );

  return NextResponse.json({ ok: true, count: results.length });
}
