import { cookies } from "next/headers";
import { getDb } from "@/db";
import { gmailAccounts } from "@/db/schema";
import { safeEqual } from "@/lib/auth";
import { decryptToken, encryptToken, exchangeCode, profileEmail, revoke } from "@/lib/gmail";
import { getAccount, syncGmail } from "@/lib/mailbox";
import { isSignedIn } from "@/lib/session";

// Google sends her back here after she allows access.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const back = (status: string) => Response.redirect(`${url.origin}/inbox?gmail=${status}`, 303);
  if (!(await isSignedIn())) return Response.redirect(`${url.origin}/login`, 303);

  const jar = await cookies();
  const expected = jar.get("kw_gmail_state")?.value;
  jar.delete("kw_gmail_state");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  if (!code || !expected || !safeEqual(state, expected)) return back(url.searchParams.get("error") === "access_denied" ? "denied" : "error");

  try {
    const tokens = await exchangeCode(code, url.origin);
    if (!tokens.refresh_token) return back("error");
    const email = await profileEmail(tokens.access_token);
    const db = await getDb();
    // One mailbox per business: connecting again replaces the old one.
    const old = await getAccount(db);
    if (old) await db.delete(gmailAccounts);
    await db.insert(gmailAccounts).values({ email, refreshToken: await encryptToken(tokens.refresh_token) });
    if (old) await revoke(await decryptToken(old.refreshToken)).catch(() => {});
    await syncGmail(db, { force: true });
    return back("connected");
  } catch (err) {
    console.error("[gmail] connect failed:", err);
    return back("error");
  }
}
