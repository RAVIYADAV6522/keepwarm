import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, passcodeToken } from "@/lib/auth";

// Passcode gate. Off when APP_PASSCODE is unset (local dev).
// Public: the contact form, the inbound webhooks (they check their own token) and the cron route (CRON_SECRET).
const PUBLIC = [/^\/login/, /^\/contact/, /^\/api\/inbound\//, /^\/api\/cron\//];

export async function proxy(req: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode || PUBLIC.some((re) => re.test(req.nextUrl.pathname))) return NextResponse.next();

  if (req.cookies.get(AUTH_COOKIE)?.value === (await passcodeToken(passcode))) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const login = new URL("/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
