import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// Lightweight cookie-presence gate. This runs on the Edge runtime, so it
// deliberately avoids importing the crypto-based signature check — the
// authoritative role/signature check happens server-side in each protected
// layout/page via getSession(). This just keeps logged-out visitors from
// ever rendering a protected page's shell.
const PUBLIC_PATHS = ["/login"];
// /api/debug/* routes (run-update, verify-update) were re-gated behind the
// normal session gate on 2026-08-13 after confirming all 11 pending
// corrections landed (Antonio, David, Diana, Rodrigo, Ricardo, Mariana) —
// no exemption for them here. The route files stay in the repo, inert
// without a session, ready to reuse next time a one-off correction is
// needed (see badge-acceleration-monthly-check skill for the pattern).
const PUBLIC_PREFIXES = ["/api/auth"];

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
