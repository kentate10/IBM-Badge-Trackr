import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const password = (body as { password?: unknown })?.password;
  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  // Admin password is checked first so it always wins if the two happen to
  // be set to the same value during initial setup.
  if (checkPassword(password, "admin")) {
    await setSessionCookie({ role: "admin" });
    return NextResponse.json({ role: "admin" });
  }
  if (checkPassword(password, "member")) {
    await setSessionCookie({ role: "member" });
    return NextResponse.json({ role: "member" });
  }
  return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
}
