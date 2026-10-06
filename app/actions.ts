"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db";
import { jobs } from "@/db/schema";
import { EQUIPMENT, LOG_KINDS, SNOOZE_OPTIONS, SOURCES, STAGES, URGENCY, type LogKind, type SnoozeOption, type Stage, type Urgency } from "@/lib/constants";
import { config } from "@/lib/config";
import { attachMessage, createJob } from "@/lib/intake";
import { addNote, logContact, moveStage, snooze, snoozeTarget, updateJob, wake } from "@/lib/jobs";
import { DEMO_SAMPLES, type DemoKind } from "@/lib/demo-samples";
import { matchCustomer } from "@/lib/match";
import { sendEmergencyAlert } from "@/lib/notify";
import { seed } from "@/lib/seed";
import { createShare, revokeShare } from "@/lib/share";
import { setCustomerNote } from "@/lib/customers";
import { dollarsToCents } from "@/lib/format";
import { formatDate, fromDateInput } from "@/lib/time";

// Thin server-action wrappers: validate input, call lib/jobs, refresh every screen.

function refresh() {
  revalidatePath("/", "layout");
}

export async function logContactAction(jobId: number, kind: LogKind, note: string, quote?: string) {
  if (!LOG_KINDS.includes(kind)) throw new Error("Unknown contact type");
  await logContact(await getDb(), jobId, kind, { note, quoteCents: dollarsToCents(quote) });
  refresh();
}

export async function moveStageAction(jobId: number, stage: Stage, opts: { lostReason?: string; visitDate?: string } = {}) {
  if (!STAGES.includes(stage)) throw new Error("Unknown stage");
  const scheduledFor = opts.visitDate ? fromDateInput(opts.visitDate, config.BUSINESS_TZ) : undefined;
  await moveStage(await getDb(), jobId, stage, { lostReason: opts.lostReason, scheduledFor });
  refresh();
}

export async function setQuoteAction(jobId: number, dollars: string) {
  await updateJob(await getDb(), jobId, { quoteAmount: dollarsToCents(dollars) });
  refresh();
}

export async function setFollowUpAction(jobId: number, date: string) {
  await updateJob(await getDb(), jobId, { nextFollowUpAt: fromDateInput(date, config.BUSINESS_TZ) });
  refresh();
}

// Returns the wake-up day for the toast, e.g. "Mon, Oct 12".
export async function snoozeAction(jobId: number, choice: SnoozeOption | { date: string }) {
  const tz = config.BUSINESS_TZ;
  const now = new Date();
  const until = typeof choice === "string" ? (SNOOZE_OPTIONS.includes(choice) ? snoozeTarget(choice, now) : null) : fromDateInput(choice.date, tz);
  if (!until || until <= now) throw new Error("Pick a day in the future");
  await snooze(await getDb(), jobId, until, now);
  refresh();
  return formatDate(until, tz);
}

export async function wakeAction(jobId: number) {
  await wake(await getDb(), jobId);
  refresh();
}

export async function setCustomerNoteAction(customerId: number, note: string) {
  await setCustomerNote(await getDb(), customerId, note.slice(0, 2000));
  refresh();
}

export async function createShareAction() {
  const token = await createShare(await getDb());
  revalidatePath("/numbers");
  return token;
}

export async function revokeShareAction() {
  await revokeShare(await getDb());
  revalidatePath("/numbers");
}

export async function setVisitAction(jobId: number, date: string) {
  await updateJob(await getDb(), jobId, { scheduledFor: fromDateInput(date, config.BUSINESS_TZ) });
  refresh();
}

export async function setUrgencyAction(jobId: number, urgency: Urgency) {
  if (!URGENCY.includes(urgency)) throw new Error("Unknown urgency");
  await updateJob(await getDb(), jobId, { urgency });
  refresh();
}

export async function addNoteAction(jobId: number, note: string) {
  await addNote(await getDb(), jobId, note);
  refresh();
}

export async function matchCustomerAction(phone: string, email: string) {
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
export async function saveJobAction(input: z.input<typeof JobInputSchema>, raw: string, attachToJobId?: number) {
  const data = JobInputSchema.parse(input);
  const db = await getDb();
  if (!data.businessName && !data.customerName && !data.phone && !data.email) {
    throw new Error("Add at least a name or a phone number");
  }
  if (attachToJobId) {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, attachToJobId));
    if (!job) throw new Error("That job no longer exists");
    await attachMessage(db, job, raw || data.problem, data.source);
    refresh();
    return { jobId: job.id, attached: true };
  }
  const job = await createJob(db, data, { raw });
  if (job.urgency === "emergency") await sendEmergencyAlert(db, job.id);
  refresh();
  return { jobId: job.id, attached: false };
}

// /demo: post a realistic payload to the real webhook route, exactly like Twilio or an email service would.
export async function simulateAction(kind: DemoKind, index: number) {
  const samples = DEMO_SAMPLES[kind];
  const payload = samples[index % samples.length];
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const path = { webform: "webform", email: "email", sms: "sms", call: "call" }[kind];
  const token = process.env.INBOUND_TOKEN ? `?token=${encodeURIComponent(process.env.INBOUND_TOKEN)}` : "";
  const res = await fetch(`${origin}/api/inbound/${path}${token}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: h.get("cookie") ?? "" },
    body: JSON.stringify(payload),
  });
  refresh();
  return { status: res.status, payload, result: await res.json() };
}

export async function resetDemoAction() {
  await seed(await getDb());
  refresh();
}
