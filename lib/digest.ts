import type { JobWithCustomer } from "./queries";
import { BUSINESS_NAME, config, OWNER_NAME } from "./config";
import { displayName, money, plural } from "./format";
import { formatPhone } from "./phone";
import type { TodayGroup } from "./today";

// The morning email: the Today list, in her inbox before she's out the door.

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const TONE_HEX: Record<string, string> = { red: "#D42A35", amber: "#B45309", green: "#0F7B5F", blue: "#3B5BDB", clay: "#C2410C", neutral: "#5D6476" };

export function buildDigest(
  today: { groups: TodayGroup<JobWithCustomer>[]; calls: number; quotes: number },
  stats: { open: number; waitingCents: number },
  now: Date,
  appUrl = process.env.APP_URL || "",
) {
  const date = now.toLocaleDateString("en-US", { timeZone: config.BUSINESS_TZ, weekday: "long", month: "long", day: "numeric" });
  const headline =
    today.calls || today.quotes
      ? [today.calls ? `${plural(today.calls, "person", "people")} to call` : "", today.quotes ? `${plural(today.quotes, "quote")} to write` : ""].filter(Boolean).join(" · ")
      : "You're all caught up ☕";
  const subject = `${date}: ${headline}`;

  const text = [
    `Good morning, ${OWNER_NAME}. ${headline}.`,
    "",
    ...today.groups.flatMap((g) => [
      `${g.label.toUpperCase()} (${g.items.length})`,
      ...g.items.map(({ job, reason }) => `- ${displayName(job.customer)}: ${job.problem} — ${reason}${job.customer.phone ? ` — ${formatPhone(job.customer.phone)}` : ""}`),
      "",
    ]),
    `Open jobs: ${stats.open} · Waiting on a yes: ${money(stats.waitingCents) || "$0"}`,
    appUrl ? `Open KeepWarm: ${appUrl}` : "",
  ].join("\n");

  const rows = today.groups
    .map(
      (g) => `
      <tr><td style="padding:22px 0 8px;font:600 12px/1 -apple-system,Segoe UI,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:${TONE_HEX[g.tone]}">${esc(g.label)} · ${g.items.length}</td></tr>
      ${g.items
        .map(({ job, reason }) => {
          const phone = job.customer.phone;
          const link = appUrl ? `${appUrl}/jobs/${job.id}` : "";
          return `<tr><td style="padding:12px 14px;background:#FFFFFF;border:1px solid #E3E6EC;border-radius:12px;font:15px/1.4 -apple-system,Segoe UI,sans-serif;color:#0E1220">
            <div style="font-weight:600">${link ? `<a href="${esc(link)}" style="color:#0E1220;text-decoration:none">${esc(displayName(job.customer))}</a>` : esc(displayName(job.customer))}${job.quoteAmount ? ` <span style="float:right">${money(job.quoteAmount)}</span>` : ""}</div>
            <div style="color:#5D6476;font-size:14px">${esc(job.problem)}</div>
            <div style="margin-top:6px;font-size:13px;color:${TONE_HEX[g.tone]}">${esc(reason)}${phone ? ` · <a href="tel:${phone}" style="color:#F0602F;font-weight:600">Call ${esc(formatPhone(phone))}</a>` : ""}</div>
          </td></tr><tr><td style="height:8px"></td></tr>`;
        })
        .join("")}`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#F4F5F8">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F8"><tr><td align="center" style="padding:28px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="font:14px -apple-system,Segoe UI,sans-serif;color:#5D6476">${esc(date)} · ${esc(BUSINESS_NAME)}</td></tr>
    <tr><td style="padding-top:6px;font:32px/1.15 Georgia,serif;color:#0E1220">Good morning, ${esc(OWNER_NAME)}</td></tr>
    <tr><td style="padding-top:12px"><span style="display:inline-block;background:#FFECE3;color:#C2410C;font:600 15px -apple-system,Segoe UI,sans-serif;padding:8px 14px;border-radius:999px">${esc(headline)}</span></td></tr>
    ${rows}
    <tr><td style="padding-top:20px;font:14px -apple-system,Segoe UI,sans-serif;color:#5D6476">Open jobs: <b style="color:#0E1220">${stats.open}</b> · Waiting on a yes: <b style="color:#0E1220">${money(stats.waitingCents) || "$0"}</b></td></tr>
    ${appUrl ? `<tr><td style="padding-top:18px"><a href="${esc(appUrl)}" style="display:inline-block;background:#F0602F;color:#fff;font:600 15px -apple-system,Segoe UI,sans-serif;padding:12px 18px;border-radius:12px;text-decoration:none">Open KeepWarm</a></td></tr>` : ""}
  </table></td></tr></table></body></html>`;

  return { subject, text, html };
}
