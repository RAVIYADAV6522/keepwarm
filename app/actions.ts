"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { LOG_KINDS, STAGES, URGENCY, type LogKind, type Stage, type Urgency } from "@/lib/constants";
import { config } from "@/lib/config";
import { addNote, logContact, moveStage, updateJob } from "@/lib/jobs";
import { dollarsToCents } from "@/lib/format";
import { fromDateInput } from "@/lib/time";

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
