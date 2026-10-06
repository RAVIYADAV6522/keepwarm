import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { customers, jobs } from "@/db/schema";
import { OWNER_NAME } from "./config";
import { displayName, EQUIPMENT_LABEL, SOURCE_LABEL } from "./format";
import { formatPhone } from "./phone";

// Email out. With RESEND_API_KEY set it really sends; otherwise it logs to the console,
// so the whole app works locally without an email account.

type Email = { subject: string; html: string; text: string };

export async function sendEmail(email: Email): Promise<boolean> {
  const to = process.env.ALERT_EMAIL_TO;
  if (!process.env.RESEND_API_KEY || !to) {
    console.log(`\n[email:console] To: ${to ?? "(ALERT_EMAIL_TO not set)"}\nSubject: ${email.subject}\n\n${email.text}\n`);
    return false;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.ALERT_EMAIL_FROM || "KeepWarm <onboarding@resend.dev>",
    to: to.split(",").map((s) => s.trim()),
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) {
    console.error("[email] Resend failed:", error);
    return false;
  }
  return true;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// "Freezer down" can't wait for tomorrow's digest — tell Denise now.
export async function sendEmergencyAlert(db: Db, jobId: number): Promise<boolean> {
  const [row] = await db.select().from(jobs).innerJoin(customers, eq(jobs.customerId, customers.id)).where(eq(jobs.id, jobId));
  if (!row) return false;
  const { jobs: job, customers: c } = row;
  const name = displayName(c);
  const phone = formatPhone(c.phone);
  const url = process.env.APP_URL ? `${process.env.APP_URL}/jobs/${job.id}` : `/jobs/${job.id}`;
  const lines = [
    `${name}${c.name && c.businessName ? ` (${c.name})` : ""}`,
    job.problem,
    `${EQUIPMENT_LABEL[job.equipment]} · came in by ${SOURCE_LABEL[job.source].toLowerCase()}`,
    phone ? `Call: ${phone}` : c.email ? `Email: ${c.email}` : "",
    url,
  ].filter(Boolean);
  return sendEmail({
    subject: `🚨 Emergency: ${name} — ${job.problem}`,
    text: `${OWNER_NAME}, an emergency just came in.\n\n${lines.join("\n")}`,
    html: `<p>${esc(OWNER_NAME)}, an emergency just came in.</p><p><strong>${esc(name)}</strong><br>${esc(job.problem)}<br>${esc(
      EQUIPMENT_LABEL[job.equipment],
    )}</p>${c.phone ? `<p><a href="tel:${c.phone}">Call ${esc(phone)}</a></p>` : ""}<p><a href="${esc(url)}">Open in KeepWarm</a></p>`,
  });
}
