import Link from "next/link";
import { wakeAction } from "@/app/actions";
import { TodayCard } from "@/components/TodayCard";
import { config, OWNER_NAME } from "@/lib/config";
import { plural, TONE_DOT, TONE_TEXT } from "@/lib/format";
import { getToday } from "@/lib/queries";
import { formatDate, hourIn } from "@/lib/time";
import { toCardJob } from "@/lib/view";

export default async function TodayPage() {
  const now = new Date();
  const { groups, snoozed, calls, quotes } = await getToday(now);
  const tz = config.BUSINESS_TZ;
  const hour = hourIn(now, tz);
  const greeting = `Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, ${OWNER_NAME}`;
  const date = now.toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" });
  const summary = [calls ? `${plural(calls, "person", "people")} to call today` : "", quotes ? `${plural(quotes, "quote")} to write` : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3.5">
        <div className="flex flex-col gap-1.5">
          <div className="text-[15px] text-ink2">{date}</div>
          <h1 className="font-serif text-[clamp(32px,4vw,44px)] leading-[1.08] tracking-[-0.01em]">{greeting}</h1>
        </div>
        {summary && <div className="rounded-full bg-clay px-[15px] py-[9px] text-[15px] font-semibold text-clay-ink">{summary}</div>}
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center gap-3.5 py-[72px] text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-clay text-[44px]">☕</div>
          <div className="mt-1.5 font-serif text-[28px]">You&apos;re all caught up</div>
          <div className="max-w-[300px] text-base leading-normal text-pretty text-ink2">
            Nobody needs a call today. New jobs and follow-ups will show up here.
          </div>
          <Link href="/jobs" className="btn-secondary mt-2.5 h-12 px-[22px] text-base">
            See all jobs
          </Link>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-0.5">
            <span className={`h-2 w-2 rounded-full ${TONE_DOT[g.tone]}`} />
            <h2 className={`text-[12.5px] font-semibold tracking-[0.06em] uppercase ${TONE_TEXT[g.tone]}`}>{g.label}</h2>
            <span className="text-[13px] text-ink2">{g.items.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {g.items.map((item) => (
              <TodayCard
                key={item.job.id}
                job={toCardJob(item.job)}
                reason={item.reason}
                tone={g.tone}
                suggestLost={item.suggestLost}
                attempts={item.job.contactAttempts}
              />
            ))}
          </div>
        </section>
      ))}

      {snoozed.length > 0 && (
        <details className="card group overflow-hidden">
          <summary className="flex h-[52px] cursor-pointer list-none items-center justify-between px-4 text-[15px] font-medium">
            <span>
              Snoozed <span className="text-ink2">{snoozed.length}</span>
            </span>
            <span className="text-[13px] text-ink2">
              <span className="group-open:hidden">Show ▾</span>
              <span className="hidden group-open:inline">Hide ▴</span>
            </span>
          </summary>
          <ul className="divide-y divide-line border-t border-line">
            {snoozed.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <Link href={`/jobs/${j.id}`} className="min-w-0">
                  <div className="truncate text-[15px] font-medium">{toCardJob(j).name}</div>
                  <div className="text-[13px] text-ink2">Back on {formatDate(j.snoozedUntil!, tz)}</div>
                </Link>
                <form action={wakeAction.bind(null, j.id)}>
                  <button type="submit" className="btn-secondary h-10 px-3.5 text-sm">
                    Bring back now
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
