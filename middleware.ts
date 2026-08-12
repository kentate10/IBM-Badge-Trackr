import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

// Lightweight cookie-presence gate. This runs on the Edge runtime, so it
// deliberately avoids importing the crypto-based signature check — the
// authoritative role/signature check happens server-side in each protected
// layout/page via getSession(). This just keeps logged-out visitors from
// ever rendering a protected page's shell.
const PUBLIC_PATHS = ["/login"];
const PUBLIC_PREFIXES = ["/api/auth"];
// The one-off /api/debug/* routes (verify-update, run-update) used on
// 2026-08-12 to fix the failed preDeployCommand data migration are back
// behind the normal session gate now that they're no longer needed — no
// exemption for them here. The route files themselves are left in the repo
// (harmless, inert without a session) rather than deleted, since a sandbox
// filesystem-permission quirk blocked removing them; delete them by hand
// next time app/api/debug is touched, if you want a fully clean tree.

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
