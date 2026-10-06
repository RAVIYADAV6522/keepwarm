// One shared passcode for Denise (and her husband). No accounts — she asked for simple.
export const AUTH_COOKIE = "keepwarm_pass";

export async function passcodeToken(passcode: string): Promise<string> {
  const data = new TextEncoder().encode(`keepwarm:${passcode}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
