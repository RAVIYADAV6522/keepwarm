"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { jobs } from "@/db/schema";
import { EQUIPMENT, LOG_KINDS, SNOOZE_OPTIONS, SOURCES, STAGES, URGENCY, type LogKind, type SnoozeOption, type Stage, type Urgency } from "@/lib/constants";
import { config } from "@/lib/config";
import { attachMessage, createJob } from "@/lib/intake";
import { addNote, logContact, moveStage, snooze, snoozeTarget, updateJob, wake } from "@/lib/jobs";
import { DEMO_SAMPLES, SAMPLE_EMAILS, type DemoKind } from "@/lib/demo-samples";
import { decryptToken, revoke } from "@/lib/gmail";
import { getAccount, processEmail, resolveItem, syncGmail } from "@/lib/mailbox";
import { gmailAccounts } from "@/db/schema";
import { matchCustomer } from "@/lib/match";
import { sendEmergencyAlert } from "@/lib/notify";
import { seed } from "@/lib/seed";
import { createShare, revokeShare } from "@/lib/share";
import { setCustomerNote } from "@/lib/customers";
import { dollarsToCents } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { requireAuth } from "@/lib/session";
import { POST as callWebhook } from "./api/inbound/call/route";
import { POST as emailWebhook } from "./api/inbound/email/route";
import { POST as smsWebhook } from "./api/inbound/sms/route";
import { POST as webformWebhook } from "./api/inbound/webform/route";

const INBOUND = { webform: webformWebhook, email: emailWebhook, sms: smsWebhook, call: callWebhook };
import { formatDate, fromDateInput } from "@/lib/time";

// Thin server-action wrappers: validate input, call lib/jobs, refresh every screen.

function refresh() {
  revalidatePath("/", "layout");
}

export async function logContactAction(jobId: number, kind: LogKind, note: string, quote?: string) {
  await requireAuth();
  if (!LOG_KINDS.includes(kind)) throw new Error("Unknown contact type");
  await logContact(await getDb(), jobId, kind, { note, quoteCents: dollarsToCents(quote) });
  refresh();
}

export async function moveStageAction(jobId: number, stage: Stage, opts: { lostReason?: string; visitDate?: string } = {}) {
  await requireAuth();
  if (!STAGES.includes(stage)) throw new Error("Unknown stage");
  const scheduledFor = opts.visitDate ? fromDateInput(opts.visitDate, config.BUSINESS_TZ) : undefined;
  await moveStage(await getDb(), jobId, stage, { lostReason: opts.lostReason, scheduledFor });
  refresh();
}

export async function setQuoteAction(jobId: number, dollars: string) {
  await requireAuth();
  // Empty clears the quote; anything else must be a real amount (never wipe a quote because of a typo).
  const cents = dollarsToCents(dollars);
  if (dollars.trim() && cents == null) return { error: "Enter an amount like 1250", cents: null };
  await updateJob(await getDb(), jobId, { quoteAmount: cents });
  refresh();
  return { error: null, cents };
}

export async function setFollowUpAction(jobId: number, date: string) {
  await requireAuth();
  await updateJob(await getDb(), jobId, { nextFollowUpAt: fromDateInput(date, config.BUSINESS_TZ) });
  refresh();
}

// Returns the wake-up day for the toast, e.g. "Mon, Oct 12".
export async function snoozeAction(jobId: number, choice: SnoozeOption | { date: string }) {
  await requireAuth();
  const tz = config.BUSINESS_TZ;
  const now = new Date();
  const until = typeof choice === "string" ? (SNOOZE_OPTIONS.includes(choice) ? snoozeTarget(choice, now) : null) : fromDateInput(choice.date, tz);
  if (!until || until <= now) throw new Error("Pick a day in the future");
  await snooze(await getDb(), jobId, until, now);
  refresh();
  return formatDate(until, tz);
}

export async function wakeAction(jobId: number) {
  await requireAuth();
  await wake(await getDb(), jobId);
  refresh();
}

export async function setCustomerNoteAction(customerId: number, note: string) {
  await requireAuth();
  await setCustomerNote(await getDb(), customerId, note.slice(0, 2000));
  refresh();
}

// --- Gmail inbox ---------------------------------------------------------------------------------

// Called when the app opens (throttled to every 2 minutes) and by "Check now".
export async function syncGmailAction(force = false) {
  await requireAuth();
  const result = await syncGmail(await getDb(), { force });
  if (result.pending || result.auto) refresh();
  return result;
}

export async function disconnectGmailAction() {
  await requireAuth();
  const db = await getDb();
  const account = await getAccount(db);
  if (!account) return;
  await db.delete(gmailAccounts);
  await revoke(await decryptToken(account.refreshToken)).catch(() => {});
  refresh();
}

export async function dismissInboxAction(id: number) {
  await requireAuth();
  await resolveItem(await getDb(), id, "dismissed");
  refresh();
}

// Demo: run four realistic emails through the same pipeline a real Gmail message goes through.
export async function loadSampleEmailsAction() {
  await requireAuth();
  const db = await getDb();
  const stamp = Date.now();
  const outcomes = [];
  for (const [i, m] of SAMPLE_EMAILS.entries()) {
    outcomes.push(await processEmail(db, { ...m, id: `sample-${stamp}-${i}`, receivedAt: new Date(stamp - (SAMPLE_EMAILS.length - i) * 600_000) }));
  }
  refresh();
  return outcomes;
}

export async function createShareAction() {
  await requireAuth();
  const token = await createShare(await getDb());
  revalidatePath("/numbers");
  return token;
}

export async function revokeShareAction() {
  await requireAuth();
  await revokeShare(await getDb());
  revalidatePath("/numbers");
}

export async function setVisitAction(jobId: number, date: string) {
  await requireAuth();
  await updateJob(await getDb(), jobId, { scheduledFor: fromDateInput(date, config.BUSINESS_TZ) });
  refresh();
}

export async function setUrgencyAction(jobId: number, urgency: Urgency) {
  await requireAuth();
  if (!URGENCY.includes(urgency)) throw new Error("Unknown urgency");
  await updateJob(await getDb(), jobId, { urgency });
  refresh();
}

export async function addNoteAction(jobId: number, note: string) {
  await requireAuth();
  await addNote(await getDb(), jobId, note);
  refresh();
}

export async function matchCustomerAction(phone: string, email: string) {
  await requireAuth();
  return matchCustomer(await getDb(), phone || null, email || null);
}

const JobInputSchema = z.object({
  customerName: z.string().trim().nullable(),
  businessName: z.string().trim().nullable(),
  phone: z.string().trim().nullable(),
  email: z.string().trim().nullable(),
  address: z.string().trim().nullable(),
  problem: z.string().trim().min(1, "Add a short description of the problem"),
  equipment: z.enum(EQUIPMENT),
  urgency: z.enum(URGENCY),
  source: z.enum(SOURCES),
});

// Save from the "+" screen. Either a new job, or (for a repeat customer with an open job)
// a note on that job so the same request doesn't show up twice.
export async function saveJobAction(input: z.input<typeof JobInputSchema>, raw: string, attachToJobId?: number, inboxId?: number) {
  await requireAuth();
  // Problems come back as values: Next.js hides thrown error messages in production.
  const parsed = JobInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the fields and try again" };
  const data = parsed.data;
  const db = await getDb();
  if (!data.businessName && !data.customerName && !data.phone && !data.email) {
    return { error: "Add at least a name or a phone number" };
  }
  if (data.phone && !normalizePhone(data.phone)) {
    return { error: "That phone number doesn't look right. Use 10 digits, like (312) 555-0142." };
  }
  if (attachToJobId) {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, attachToJobId));
    if (!job) return { error: "That job no longer exists" };
    await attachMessage(db, job, raw || data.problem, data.source);
    if (inboxId) await resolveItem(db, inboxId, "added", job.id);
    refresh();
    return { jobId: job.id, attached: true };
  }
  const job = await createJob(db, data, { raw, autoAdded: !!inboxId });
  if (inboxId) await resolveItem(db, inboxId, "added", job.id);
  if (job.urgency === "emergency") await sendEmergencyAlert(db, job.id);
  refresh();
  return { jobId: job.id, attached: false };
}

// /demo: hand a realistic payload to the real webhook handler, exactly as Twilio or an email service would.
// Called in-process (not over HTTP), so the inbound token never leaves the server.
export async function simulateAction(kind: DemoKind, index: number) {
  await requireAuth();
  const samples = DEMO_SAMPLES[kind];
  const payload = samples[index % samples.length];
  const token = process.env.INBOUND_TOKEN ? `?token=${encodeURIComponent(process.env.INBOUND_TOKEN)}` : "";
  const req = new Request(`http://keepwarm.local/api/inbound/${kind}${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const res = await INBOUND[kind](req);
  refresh();
  return { status: res.status, payload, result: await res.json() };
}

export async function resetDemoAction() {
  await requireAuth();
  await seed(await getDb());
  refresh();
}
