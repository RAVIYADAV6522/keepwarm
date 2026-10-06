// One shared passcode for Denise (and her husband). No accounts — she asked for simple.
export const AUTH_COOKIE = "keepwarm_pass";

export async function passcodeToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`keepwarm:${passcode}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string compare, so response timing gives nothing away. Works in the proxy runtime too.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidCookie(value: string | undefined): Promise<boolean> {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return true; // passcode off (local dev)
  return !!value && safeEqual(value, await passcodeToken(passcode));
}

// Only ever send people back to a path on this site after sign-in ("/\evil.com" is another site to a browser).
export function safeNext(next: string): string {
  try {
    const url = new URL(next, "http://keepwarm.local");
    return url.origin === "http://keepwarm.local" ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}
