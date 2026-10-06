import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import type { Db } from "@/db";
import { gmailAccounts, inboxItems, type InboxItem } from "@/db/schema";
import { extract, type ExtractResult } from "./extract";
import { REPAIR_RE } from "./extract-rules";
import { findCustomer, findOpenJob, intake } from "./intake";
import { accessToken, decryptToken, getMessage, listMessageIds, type MailMessage } from "./gmail";
import { normalizePhone } from "./phone";

// Email enquiries from her Gmail. What happens to each new message:
//   - a customer with an open job writes in  -> attached to that job automatically (like a text reply)
//   - an emergency ("freezer down")           -> straight onto Today + alert, no waiting for review
//   - looks like a job enquiry                -> "pending" in the Inbox, fields filled in, she reviews
//   - anything else (newsletters, receipts)   -> skipped; only the Gmail id is kept, never the content

export type ProcessOutcome = "pending" | "auto" | "ignored" | "duplicate";

export function emailText(m: Pick<MailMessage, "fromName" | "fromEmail" | "subject" | "text">): string {
  const from = m.fromName ? `${m.fromName} <${m.fromEmail ?? ""}>` : (m.fromEmail ?? "");
  return `From: ${from}\nSubject: ${m.subject}\n\n${m.text}`;
}

export async function processEmail(db: Db, m: MailMessage, now = new Date()): Promise<ProcessOutcome> {
  const [seen] = await db.select({ id: inboxItems.id }).from(inboxItems).where(eq(inboxItems.gmailId, m.id));
  if (seen) return "duplicate";

  const raw = emailText(m);
  const extracted = await extract(raw, "email");
  // A real inbox is mostly not enquiries. Something only counts as one if it's about refrigeration work
  // and isn't a newsletter or a calendar invite. (Replies from a customer with an
  // open job are handled below regardless — they're attached to that job.)
  // (Website forms sent from a no-reply address still get through: they're about the work.)
  const aboutTheWork = REPAIR_RE.test(`${m.subject}\n${m.text}`);
  if (!aboutTheWork || m.bulk || m.calendar) extracted.is_job_request = false;
  const email = extracted.email ?? m.fromEmail;
  const customer = await findCustomer(db, normalizePhone(extracted.phone), email);
  const openJob = customer ? await findOpenJob(db, customer.id) : null;
  const base = { gmailId: m.id, receivedAt: m.receivedAt, createdAt: now };

  if (openJob || (extracted.is_job_request && extracted.urgency === "emergency")) {
    const result = await intake(db, raw, "email", { overrides: { email, customerName: extracted.customer_name ?? m.fromName } }, now);
    const jobId = "job" in result ? result.job.id : null;
    await db.insert(inboxItems).values({ ...base, ...summaryFields(m, raw, extracted), status: jobId ? "auto" : "ignored", jobId });
    return jobId ? "auto" : "ignored";
  }

  if (!extracted.is_job_request) {
    await db.insert(inboxItems).values({ ...base, status: "ignored" });
    return "ignored";
  }

  await db.insert(inboxItems).values({ ...base, ...summaryFields(m, raw, extracted), status: "pending" });
  return "pending";
}

function summaryFields(m: MailMessage, raw: string, extracted: ExtractResult) {
  return {
    fromName: m.fromName,
    fromEmail: m.fromEmail,
    subject: m.subject,
    body: raw,
    extracted: { ...extracted, email: extracted.email ?? m.fromEmail, customer_name: extracted.customer_name ?? m.fromName },
  };
}

// --- Sync -------------------------------------------------------------------------------------

const MIN_GAP_MS = 2 * 60_000; // don't hit Gmail more than every 2 minutes
const FIRST_LOOKBACK_MS = 3 * 86_400_000; // on first connect, look at the last 3 days

export async function getAccount(db: Db) {
  const [account] = await db.select().from(gmailAccounts).limit(1);
  return account ?? null;
}

// scanned: new emails looked at this time; pending/auto/ignored: what they became.
export type SyncResult = { checked: boolean; scanned: number; pending: number; auto: number; ignored: number; error?: string };

export async function syncGmail(db: Db, opts: { force?: boolean } = {}, now = new Date()): Promise<SyncResult> {
  const account = await getAccount(db);
  const none = { scanned: 0, pending: 0, auto: 0, ignored: 0 };
  if (!account) return { checked: false, ...none };
  if (!opts.force && account.lastSyncedAt && now.getTime() - account.lastSyncedAt.getTime() < MIN_GAP_MS) {
    return { checked: false, ...none };
  }
  // Claim the slot first so two tabs opening at once don't both sync.
  await db.update(gmailAccounts).set({ lastSyncedAt: now }).where(eq(gmailAccounts.id, account.id));

  try {
    const token = await accessToken(await decryptToken(account.refreshToken));
    // Overlap a day with the last sync: Gmail's "after:" is coarse, and duplicates are skipped anyway.
    const since = account.lastSyncedAt ? new Date(account.lastSyncedAt.getTime() - 86_400_000) : new Date(now.getTime() - FIRST_LOOKBACK_MS);
    const ids = await listMessageIds(token, since);
    const known = ids.length
      ? new Set((await db.select({ g: inboxItems.gmailId }).from(inboxItems).where(inArray(inboxItems.gmailId, ids))).map((r) => r.g))
      : new Set<string>();

    const fresh = ids.filter((i) => !known.has(i)).reverse();
    const result = { checked: true, scanned: fresh.length, pending: 0, auto: 0, ignored: 0 };
    for (const id of fresh) {
      const outcome = await processEmail(db, await getMessage(token, id), now);
      if (outcome === "pending" || outcome === "auto" || outcome === "ignored") result[outcome]++;
    }
    return result;
  } catch (err) {
    console.error("[gmail] sync failed:", err);
    return { checked: true, ...none, error: "Couldn't reach Gmail. Try reconnecting." };
  }
}

// --- Inbox queries ----------------------------------------------------------------------------

export async function pendingItems(db: Db): Promise<InboxItem[]> {
  return db.select().from(inboxItems).where(eq(inboxItems.status, "pending")).orderBy(desc(inboxItems.receivedAt));
}

export async function pendingCount(db: Db): Promise<number> {
  return (await db.select({ id: inboxItems.id }).from(inboxItems).where(eq(inboxItems.status, "pending"))).length;
}

// Handled in the last week (added, auto-added or dismissed), for the "Recently" list.
export async function recentItems(db: Db, now = new Date()): Promise<InboxItem[]> {
  return db
    .select()
    .from(inboxItems)
    .where(and(ne(inboxItems.status, "pending"), ne(inboxItems.status, "ignored"), gte(inboxItems.createdAt, new Date(now.getTime() - 7 * 86_400_000))))
    .orderBy(desc(inboxItems.receivedAt))
    .limit(20);
}

export async function getItem(db: Db, id: number): Promise<InboxItem | null> {
  const [item] = await db.select().from(inboxItems).where(eq(inboxItems.id, id));
  return item ?? null;
}

export async function resolveItem(db: Db, id: number, status: "added" | "dismissed", jobId: number | null = null) {
  await db.update(inboxItems).set({ status, jobId }).where(and(eq(inboxItems.id, id), eq(inboxItems.status, "pending")));
}
