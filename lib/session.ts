import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, isValidCookie } from "./auth";

// Server actions and API routes are public endpoints, so each one checks the passcode cookie itself
// rather than relying on the proxy alone.
export async function requireAuth() {
  if (!(await isValidCookie((await cookies()).get(AUTH_COOKIE)?.value))) throw new Error("Please sign in again.");
}

export async function isSignedIn(): Promise<boolean> {
  return isValidCookie((await cookies()).get(AUTH_COOKIE)?.value);
}
