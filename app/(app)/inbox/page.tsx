import Link from "next/link";
import { getDb } from "@/db";
import { CheckNowButton, DisconnectButton, DismissButton, SampleEmailsButton } from "@/components/InboxControls";
import { config } from "@/lib/config";
import type { ExtractResult } from "@/lib/extract";
import { TONE_CHIP, URGENCY_LABEL } from "@/lib/format";
import { gmailConfigured } from "@/lib/gmail";
import { getAccount, pendingItems, recentItems } from "@/lib/mailbox";
import { formatPhone } from "@/lib/phone";
import { timeAgo } from "@/lib/time";

export const metadata = { title: "Inbox · KeepWarm" };

const NOTICE: Record<string, { text: string; error?: boolean }> = {
  connected: { text: "Gmail connected. New enquiries will show up here." },
  denied: { text: "Gmail wasn't connected — access wasn't allowed.", error: true },
  error: { text: "Couldn't connect Gmail. Try again.", error: true },
  not_configured: { text: "Gmail isn't set up on this server yet.", error: true },
};

const URGENCY_TONE = { emergency: "red", soon: "amber", routine: "neutral" } as const;

export default async function InboxPage({ searchParams }: PageProps<"/inbox">) {
  const { gmail } = await searchParams;
  const db = await getDb();
  const [account, pending, recent] = await Promise.all([getAccount(db), pendingItems(db), recentItems(db)]);
  const now = new Date();
  const tz = config.BUSINESS_TZ;
  const notice = typeof gmail === "string" ? NOTICE[gmail] : undefined;

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[clamp(30px,3.4vw,36px)]">Inbox</h1>
        <p className="text-[15px] text-ink2">Job enquiries from your email. Check the details, then add them to your jobs.</p>
      </div>

      {notice && (
        <div className={`rounded-[14px] px-4 py-3 text-[15px] ${notice.error ? "bg-red-s text-red" : "bg-green-s text-green"}`}>{notice.text}</div>
      )}

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        {account ? (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <GmailMark />
              <div className="min-w-0 leading-tight">
                <div className="truncate text-[15px] font-semibold">{account.email}</div>
                <div className="text-[13px] text-ink2">
                  Connected · {account.lastSyncedAt ? `checked ${timeAgo(account.lastSyncedAt, now, tz)}` : "not checked yet"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <CheckNowButton />
              <DisconnectButton />
            </div>
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-3">
              <GmailMark />
              <div className="leading-snug">
                <div className="text-[15px] font-semibold">Connect your Gmail</div>
                <div className="text-[13px] text-ink2">Read-only. KeepWarm keeps only emails that look like job enquiries.</div>
              </div>
            </div>
            {gmailConfigured() ? (
              <a href="/api/gmail/connect" className="btn-primary h-11 px-5 text-[15px]">
                Connect Gmail
              </a>
            ) : (
              <span className="text-[13px] text-ink2">Needs GOOGLE_CLIENT_ID on the server</span>
            )}
          </>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-0.5">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <h2 className="text-[12.5px] font-semibold tracking-[0.06em] text-clay-ink uppercase">To review</h2>
          <span className="text-[13px] text-ink2">{pending.length}</span>
        </div>

        {pending.length === 0 && (
          <div className="card flex flex-col items-center gap-3 px-5 py-10 text-center">
            <div className="font-serif text-[22px]">Nothing waiting</div>
            <p className="max-w-[380px] text-[15px] text-ink2">
              New enquiries land here automatically. Emergencies skip the queue and go straight onto Today.
            </p>
            <SampleEmailsButton />
          </div>
        )}

        {pending.map((item) => {
          const x = item.extracted as ExtractResult;
          const who = [x.business_name, x.customer_name].filter(Boolean).join(" · ") || item.fromName || item.fromEmail;
          return (
            <div key={item.id} className="card flex min-w-0 flex-col gap-2.5 p-4 wrap-anywhere">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[17px] font-semibold">{who}</div>
                  <div className="truncate text-sm text-ink2">
                    {[formatPhone(x.phone), item.fromEmail].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="flex-none text-[13px] text-ink2">{timeAgo(item.receivedAt, now, tz)}</span>
              </div>
              {item.subject && <div className="text-sm text-ink2">“{item.subject}”</div>}
              <div className="text-[15px] leading-snug">{x.problem}</div>
              <div>
                <span className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${TONE_CHIP[URGENCY_TONE[x.urgency]]}`}>{URGENCY_LABEL[x.urgency]}</span>
              </div>
              <details className="text-sm">
                <summary className="cursor-pointer text-ink2">Show the email</summary>
                <div className="mt-2 max-h-[420px] overflow-y-auto rounded-xl bg-muted p-3 font-serif text-[15px] leading-relaxed whitespace-pre-wrap wrap-anywhere text-ink2">{item.body}</div>
              </details>
              <div className="flex gap-2">
                <Link href={`/jobs/new?inbox=${item.id}`} className="btn-primary h-11 flex-1 text-[15px]">
                  Review & add
                </Link>
                <DismissButton id={item.id} />
              </div>
            </div>
          );
        })}
        {pending.length > 0 && !account && (
          <div className="flex justify-center">
            <SampleEmailsButton />
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="px-0.5 text-[12.5px] font-semibold tracking-[0.06em] text-ink2 uppercase">Handled this week</h2>
          <div className="card divide-y divide-line">
            {recent.map((item) => {
              const label = item.status === "auto" ? "Added automatically" : item.status === "added" ? "Added as a job" : "Not a job";
              const body = (
                <>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium">{item.subject || item.fromEmail}</span>
                    <span className="block truncate text-[13px] text-ink2">
                      {item.fromName ?? item.fromEmail} · {timeAgo(item.receivedAt, now, tz)}
                    </span>
                  </span>
                  <span className={`flex-none text-[13px] font-medium ${item.status === "dismissed" ? "text-ink2" : "text-green"}`}>
                    {label}
                    {item.jobId ? " ›" : ""}
                  </span>
                </>
              );
              return item.jobId ? (
                <Link key={item.id} href={`/jobs/${item.jobId}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted">
                  {body}
                </Link>
              ) : (
                <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function GmailMark() {
  return (
    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-muted">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-clay-ink">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    </span>
  );
}
