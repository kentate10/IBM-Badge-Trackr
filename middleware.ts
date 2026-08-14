import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// Lightweight cookie-presence gate. This runs on the Edge runtime, so it
// deliberately avoids importing the crypto-based signature check — the
// authoritative role/signature check happens server-side in each protected
// layout/page via getSession(). This just keeps logged-out visitors from
// ever rendering a protected page's shell.
const PUBLIC_PATHS = ["/login"];
// /api/debug/* temporarily reopened 2026-08-14 to apply Rodrigo's Consulting
// Academy + Experience correction (see app/api/debug/run-update/route.ts).
// Re-gate this again once confirmed applied via verify-update.
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
