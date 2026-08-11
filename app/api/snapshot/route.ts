import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const label =
    typeof body?.label === "string" && body.label.trim().length > 0
      ? body.label.trim()
      : new Date().toLocaleDateString("es-CR", { year: "numeric", month: "short", day: "2-digit" });

  const members = await prisma.member.findMany();
  const allItems = await prisma.skillItem.findMany();

  let created = 0;
  for (const member of members) {
    const applicable = allItems.filter(
      (it) => (it.role === null || it.role === member.role) && (it.band === null || it.band === member.band)
    );
    const progress = await prisma.progress.findMany({
      where: { memberId: member.id, skillItemId: { in: applicable.map((i) => i.id) } },
    });
    const metCount = progress.filter((p) => p.status === "MET").length;
    const totalCount = applicable.length;
    const percentComplete = totalCount > 0 ? Math.round((metCount / totalCount) * 1000) / 10 : 0;

    await prisma.snapshot.create({
      data: { memberId: member.id, label, metCount, totalCount, percentComplete },
    });
    created += 1;
  }

  return NextResponse.json({ ok: true, label, membersSnapshotted: created });
}
