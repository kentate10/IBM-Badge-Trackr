import { cookies } from "next/headers";
import crypto from "crypto";

export type SessionRole = "member" | "admin";

export type SessionPayload = {
  role: SessionRole;
  memberId?: string;
  exp: number; // unix ms
};

const COOKIE_NAME = "badge_tracker_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Fail loudly in production; fall back only so local `next build` type
    // checks / prerendering don't crash before env vars are configured.
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is not set");
    }
    return "dev-only-insecure-secret";
  }
  return secret;
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function encodeSession(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  const sig = sign(b64);
  return `${b64}.${sig}`;
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [b64, sig] = token.split(".");
  if (!b64 || !sig) return null;
  const expected = sign(b64);
  // Constant-time comparison to avoid timing attacks.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Server Component / Route Handler helper: read + verify the current session. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE_NAME)?.value);
}

/** Route Handler helper: set the session cookie after a successful login. */
export async function setSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const store = await cookies();
  const full: SessionPayload = { ...payload, exp: Date.now() + THIRTY_DAYS_MS };
  store.set(COOKIE_NAME, encodeSession(full), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_MS / 1000,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

export function checkPassword(input: string, kind: SessionRole): boolean {
  const expected = kind === "admin" ? process.env.ADMIN_PASSWORD : process.env.TEAM_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
