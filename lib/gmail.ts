// Gmail, read-only. Plain fetch against Google's REST APIs — no SDK needed for four calls.
// Setup: a Google Cloud OAuth client (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) with the Gmail API enabled.

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export function gmailConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function redirectUri(origin: string): string {
  return `${process.env.APP_URL || origin}/api/gmail/callback`;
}

export function authUrl(state: string, origin: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline", // we need a refresh token to check mail later
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Google token error: ${json.error ?? res.status}`);
  return json as { access_token: string; refresh_token?: string };
}

export async function exchangeCode(code: string, origin: string) {
  return tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri(origin) });
}

export async function accessToken(refreshToken: string): Promise<string> {
  return (await tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" })).access_token;
}

export async function revoke(refreshToken: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, { method: "POST" }).catch(() => {});
}

async function gmail<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Gmail API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function profileEmail(token: string): Promise<string> {
  return (await gmail<{ emailAddress: string }>(token, "profile")).emailAddress;
}

// New mail in the inbox since `after`, skipping Gmail's promotions/social tabs and her own sent mail.
export async function listMessageIds(token: string, after: Date, max = 25): Promise<string[]> {
  const q = `in:inbox -category:promotions -category:social -category:forums -from:me after:${Math.floor(after.getTime() / 1000)}`;
  const res = await gmail<{ messages?: { id: string }[] }>(token, `messages?maxResults=${max}&q=${encodeURIComponent(q)}`);
  return (res.messages ?? []).map((m) => m.id);
}

export async function getMessage(token: string, id: string): Promise<MailMessage> {
  return parseMessage(await gmail<GmailMessage>(token, `messages/${id}?format=full`));
}

// --- Parsing (pure, unit tested) -------------------------------------------------------------

type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[]; headers?: { name: string; value: string }[] };
export type GmailMessage = { id: string; internalDate?: string; payload?: GmailPart };
export type MailMessage = {
  id: string;
  fromName: string | null;
  fromEmail: string | null;
  subject: string;
  receivedAt: Date;
  text: string;
  bulk?: boolean; // newsletters and mailing lists (List-Unsubscribe / List-Id / Precedence: bulk)
  calendar?: boolean; // meeting invitations and replies
};

const decode = (data: string) => Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

function hasPart(part: GmailPart | undefined, type: string): boolean {
  if (!part) return false;
  return part.mimeType === type || (part.parts ?? []).some((p) => hasPart(p, type));
}

function findPart(part: GmailPart | undefined, type: string): string | null {
  if (!part) return null;
  if (part.mimeType === type && part.body?.data) return decode(part.body.data);
  for (const p of part.parts ?? []) {
    const found = findPart(p, type);
    if (found) return found;
  }
  return null;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Drop the quoted thread under a reply ("On Mon, ... wrote:" / "> ...") — the new text is what matters.
export function stripQuoted(text: string): string {
  const cut = text.search(/\n\s*On .{5,200}wrote:\s*\n|\n-{2,}\s*Original Message\s*-{2,}|\nFrom: .+\nSent: /i);
  const body = cut > 0 ? text.slice(0, cut) : text;
  return body
    .split("\n")
    .filter((l) => !l.startsWith(">"))
    .join("\n")
    .trim();
}

export function parseFrom(value: string): { name: string | null; email: string | null } {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(value);
  if (m) return { name: m[1].trim() || null, email: m[2].trim().toLowerCase() };
  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.exec(value)?.[0];
  return { name: null, email: email?.toLowerCase() ?? null };
}

export function parseMessage(msg: GmailMessage): MailMessage {
  const header = (name: string) => msg.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";
  const plain = findPart(msg.payload, "text/plain");
  const html = plain ? null : findPart(msg.payload, "text/html");
  const from = parseFrom(header("from"));
  const subject = header("subject");
  return {
    id: msg.id,
    fromName: from.name,
    fromEmail: from.email,
    subject,
    bulk: !!header("list-unsubscribe") || !!header("list-id") || /^(bulk|list|junk)$/i.test(header("precedence")),
    calendar: hasPart(msg.payload, "text/calendar") || /^(updated )?invitation:|^(accepted|declined|tentative|canceled event|cancelled event):/i.test(subject),
    receivedAt: msg.internalDate ? new Date(Number(msg.internalDate)) : new Date(),
    text: stripQuoted(plain ?? (html ? htmlToText(html) : "")).slice(0, 10_000),
  };
}

// --- Storing the refresh token -----------------------------------------------------------------
// AES-GCM with a key derived from the OAuth client secret: a leaked database alone can't read Gmail.

async function key(): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`keepwarm-gmail:${process.env.GOOGLE_CLIENT_SECRET}`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptToken(token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(token));
  return `${Buffer.from(iv).toString("base64url")}.${Buffer.from(data).toString("base64url")}`;
}

export async function decryptToken(stored: string): Promise<string> {
  const [iv, data] = stored.split(".");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: Buffer.from(iv, "base64url") }, await key(), Buffer.from(data, "base64url"));
  return new TextDecoder().decode(plain);
}
