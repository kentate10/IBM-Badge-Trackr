import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isoWeekLabel } from "@/lib/weekLabel";
import type { Status } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const label =
    typeof body?.label === "string" && body.label.trim().length > 0
      ? body.label.trim()
      : isoWeekLabel(new Date());

  const members = await prisma.member.findMany();
  const allItems = await prisma.skillItem.findMany();

  const statusBreakdown: Record<Status, number> = { MET: 0, NOT_MET: 0, IN_PROGRESS: 0, BLOCKED: 0 };
  const sectionMap = new Map<string, Record<Status, number>>();
  const memberRows: { memberId: string; metCount: number; totalCount: number; percentComplete: number }[] = [];

  for (const member of members) {
    const applicable = allItems.filter(
      (it) => (it.role === null || it.role === member.role) && (it.band === null || it.band === member.band)
    );
    const progress = await prisma.progress.findMany({
      where: { memberId: member.id, skillItemId: { in: applicable.map((i) => i.id) } },
    });
    const progByItemId = new Map(progress.map((p) => [p.skillItemId, p]));

    let metCount = 0;
    for (const item of applicable) {
      const status: Status = progByItemId.get(item.id)?.status ?? "NOT_MET";
      statusBreakdown[status] += 1;
      if (status === "MET") metCount += 1;

      if (!sectionMap.has(item.section)) {
        sectionMap.set(item.section, { MET: 0, NOT_MET: 0, IN_PROGRESS: 0, BLOCKED: 0 });
      }
      sectionMap.get(item.section)![status] += 1;
    }

    const totalCount = applicable.length;
    const percentComplete = totalCount > 0 ? Math.round((metCount / totalCount) * 1000) / 10 : 0;
    memberRows.push({ memberId: member.id, metCount, totalCount, percentComplete });
  }

  const teamTotal = Object.values(statusBreakdown).reduce((a, b) => a + b, 0);
  const teamPercent = teamTotal > 0 ? Math.round((statusBreakdown.MET / teamTotal) * 1000) / 10 : 0;

  const sectionBreakdown = [...sectionMap.entries()]
    .map(([name, counts]) => ({
      name,
      met: counts.MET,
      inProgress: counts.IN_PROGRESS,
      blocked: counts.BLOCKED,
      notMet: counts.NOT_MET,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Upsert on label so re-saving the same week (e.g. to correct a mistake)
  // refreshes that week's numbers instead of creating a duplicate week.
  const weekly = await prisma.weeklySnapshot.upsert({
    where: { label },
    update: { teamPercent, statusBreakdown, sectionBreakdown, takenAt: new Date() },
    create: { label, teamPercent, statusBreakdown, sectionBreakdown },
  });

  await prisma.snapshot.deleteMany({ where: { weeklySnapshotId: weekly.id } });
  await prisma.snapshot.createMany({
    data: memberRows.map((m) => ({ ...m, label, weeklySnapshotId: weekly.id })),
  });

  return NextResponse.json({ ok: true, label, membersSnapshotted: memberRows.length });
}
