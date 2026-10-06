import Link from "next/link";
import { wakeAction } from "@/app/actions";
import { notFound } from "next/navigation";
import { DateField, DetailHeaderActions, QuoteField, StageStepper, UrgencyPicker } from "@/components/JobControls";
import type { ActivityType } from "@/lib/constants";
import { config } from "@/lib/config";
import { EQUIPMENT_LABEL, money, SOURCE_LABEL, STAGE_LABEL } from "@/lib/format";
import { getJob } from "@/lib/queries";
import { formatDate, formatDateTime, timeAgo, toDateInput } from "@/lib/time";
import { toCardJob } from "@/lib/view";

const DOT: Record<ActivityType, string> = {
  created: "bg-clay-ink",
  called: "bg-accent",
  texted: "bg-accent",
  emailed: "bg-accent",
  voicemail: "bg-amber",
  note: "bg-ink2",
  stage_change: "bg-green",
  quote_sent: "bg-amber",
  inbound_message: "bg-blue",
};

export default async function JobPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const data = Number.isInteger(Number(id)) ? await getJob(Number(id)) : null;
  if (!data) notFound();
  const { job, activities, otherJobs } = data;
  const card = toCardJob(job);
  const tz = config.BUSINESS_TZ;
  const now = new Date();

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <Link href="/" className="-ml-1.5 flex h-11 w-fit items-center gap-1 text-base font-medium text-clay-ink">
        <span className="text-2xl leading-none">‹</span> Today
      </Link>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink2">
          <span className="rounded-md border border-line px-[7px] py-[3px] text-[11px] font-medium tracking-[0.04em] uppercase">{SOURCE_LABEL[job.source]}</span>
          <span>{STAGE_LABEL[job.stage]}</span>
          {job.autoAdded && <span>· added automatically</span>}
        </div>
        <h1 className="font-serif text-[clamp(30px,3.6vw,38px)] leading-[1.1]">
          <Link href={`/customers/${job.customer.id}`} className="hover:text-clay-ink">
            {card.name}
          </Link>
        </h1>
        <div className="text-base text-ink2">{[card.contact, card.phoneDisplay, job.customer.email].filter(Boolean).join(" · ")}</div>
        {job.customer.address && <div className="text-[15px] text-ink2">{job.customer.address}</div>}
      </div>

      {job.customer.notes && (
        <Link href={`/customers/${job.customer.id}`} className="rounded-[14px] bg-amber-s px-4 py-3 text-[15px] leading-snug text-ink">
          <span className="field-label mb-0.5 block text-amber">Customer note</span>
          {job.customer.notes}
        </Link>
      )}

      <div className="card flex flex-col gap-1 p-4">
        <span className="field-label">The job</span>
        <span className="text-[17px] leading-snug">{job.problem}</span>
        <span className="text-sm text-ink2">{EQUIPMENT_LABEL[job.equipment]}</span>
        {job.lostReason && <span className="text-sm text-ink2">Lost: {job.lostReason}</span>}
      </div>

      {job.snoozedUntil && job.snoozedUntil > now && (
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-blue-s px-4 py-3 text-[15px] text-blue">
          <span>Snoozed · back on Today {formatDate(job.snoozedUntil, tz)}</span>
          <form action={wakeAction.bind(null, job.id)}>
            <button type="submit" className="font-semibold underline underline-offset-2">
              Bring back now
            </button>
          </form>
        </div>
      )}

      <DetailHeaderActions job={card} />
      <StageStepper job={card} />

      <div className="card divide-y divide-line">
        <label className="flex min-h-[52px] items-center justify-between gap-3 px-4">
          <span className="text-[15px] text-ink2">Quote</span>
          <QuoteField key={job.quoteAmount ?? "none"} jobId={job.id} dollars={card.quoteDollars} />
        </label>
        <label className="flex min-h-[52px] items-center justify-between gap-3 px-4">
          <span className="text-[15px] text-ink2">Next follow-up</span>
          <DateField key={`f${job.nextFollowUpAt?.getTime()}`} jobId={job.id} kind="follow_up" value={toDateInput(job.nextFollowUpAt, tz)} />
        </label>
        {(job.stage === "scheduled" || job.scheduledFor) && (
          <label className="flex min-h-[52px] items-center justify-between gap-3 px-4">
            <span className="text-[15px] text-ink2">Visit date</span>
            <DateField key={`v${job.scheduledFor?.getTime()}`} jobId={job.id} kind="visit" value={toDateInput(job.scheduledFor, tz)} />
          </label>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <span className="text-[15px] text-ink2">Urgency</span>
          <UrgencyPicker jobId={job.id} value={job.urgency} />
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-[22px]">Activity</h2>
        <ol className="flex flex-col">
          {activities.map((a, i) => (
            <li key={a.id} className="flex gap-3.5">
              <div className="flex w-3 flex-col items-center">
                <span className={`mt-[5px] h-2.5 w-2.5 flex-none rounded-full ${DOT[a.type]}`} />
                {i < activities.length - 1 && <span className="w-0.5 flex-1 bg-line" />}
              </div>
              <div className="flex flex-col gap-0.5 pb-4">
                <span className="text-base font-medium wrap-anywhere">{a.note || a.type}</span>
                <span className="text-[13.5px] text-ink2" title={formatDateTime(a.createdAt, tz)}>
                  {timeAgo(a.createdAt, now, tz)} · {formatDateTime(a.createdAt, tz)}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {job.rawInput && (
        <details className="card group overflow-hidden">
          <summary className="flex h-[52px] cursor-pointer list-none items-center justify-between px-4 text-base font-medium">
            Original message
            <span className="text-[13px] text-ink2">
              {SOURCE_LABEL[job.source]} · <span className="group-open:hidden">Show ▾</span>
              <span className="hidden group-open:inline">Hide ▴</span>
            </span>
          </summary>
          <div className="px-4 pb-4 font-serif text-base leading-relaxed whitespace-pre-wrap wrap-anywhere text-ink2 italic">{job.rawInput}</div>
        </details>
      )}

      {otherJobs.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-[22px]">Other jobs for {card.name}</h2>
            <Link href={`/customers/${job.customer.id}`} className="text-sm font-semibold text-clay-ink">
              Customer profile ›
            </Link>
          </div>
          <div className="card divide-y divide-line">
            {otherJobs.map((o) => (
              <Link key={o.id} href={`/jobs/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted">
                <span className="flex flex-col">
                  <span className="text-[15px] font-medium">{o.problem}</span>
                  <span className="text-[13px] text-ink2">
                    {STAGE_LABEL[o.stage]} · {o.createdAt.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </span>
                <span className="text-[15px] font-semibold tabular-nums">{money(o.quoteAmount)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
