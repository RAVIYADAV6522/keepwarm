import { cookies } from "next/headers";
import { authUrl, gmailConfigured } from "@/lib/gmail";
import { isSignedIn } from "@/lib/session";

// "Connect Gmail": send her to Google's consent screen (read-only access).
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!(await isSignedIn())) return Response.redirect(`${origin}/login`, 303);
  if (!gmailConfigured()) return Response.redirect(`${origin}/inbox?gmail=not_configured`, 303);

  // A one-time value Google hands back, so only a connect she started here can finish.
  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64url");
  (await cookies()).set("kw_gmail_state", state, { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", maxAge: 600, path: "/" });
  return Response.redirect(authUrl(state, origin), 303);
}
