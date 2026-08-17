import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// Lightweight cookie-presence gate. This runs on the Edge runtime, so it
// deliberately avoids importing the crypto-based signature check — the
// authoritative role/signature check happens server-side in each protected
// layout/page via getSession(). This just keeps logged-out visitors from
// ever rendering a protected page's shell.
const PUBLIC_PATHS = ["/login"];
// /api/debug/* reopened again 2026-08-17 (same day as the last re-gate) —
// run-update/route.ts now also creates the new "Comment" table (see its
// ensureCommentTable(), needed because this sandbox can't run
// `prisma db push`/migrate — see prisma/schema.prisma's Comment model).
// Needs to be hit once via a normal GET after this deploys, then re-gated
// again (remove "/api/debug" below) in a follow-up commit — same ritual as
// every previous cycle, see badge-acceleration-monthly-check skill.
const PUBLIC_PREFIXES = ["/api/auth", "/api/debug"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$).*)"],
};
