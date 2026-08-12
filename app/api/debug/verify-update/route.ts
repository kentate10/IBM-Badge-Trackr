import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// TEMPORARY, READ-ONLY debug endpoint to confirm prisma/update-2026-08-12.ts
// actually applied its changes to the live database. No auth (nothing here
// is sensitive beyond what admins already see in the app), safe to remove
// once confirmed.
export const dynamic = "force-dynamic";

const CHECK_EMAILS = [
  "cehernan@cr.ibm.com",
  "tpereira@cr.ibm.com",
  "Luis.Gomez.G@ibm.com",
  "jarobles@cr.ibm.com",
];

export async function GET() {
  const members = await prisma.member.findMany({
    where: { email: { in: CHECK_EMAILS } },
    select: {
      email: true,
      name: true,
      yearsAtIbm: true,
      progress: {
        select: {
          status: true,
          percent: true,
          skillItem: { select: { key: true } },
        },
      },
    },
  });

  return NextResponse.json({ checkedAt: new Date().toISOString(), members });
}
