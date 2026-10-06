"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { moveStageAction } from "@/app/actions";
import { TONE_CHIP, type Tone } from "@/lib/format";
import { smsHref } from "@/lib/messages";
import type { CardJob } from "@/lib/view";
import { LogSheet } from "./LogSheet";
import { MoveSheet } from "./MoveSheet";
import { SnoozeSheet } from "./SnoozeSheet";
import { toast } from "./toast";

type Props = { job: CardJob; reason: string; tone: Tone; suggestLost: boolean; attempts: number };

export function TodayCard({ job, reason, tone, suggestLost, attempts }: Props) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<null | "log" | "call" | "text" | "move" | "snooze">(null);
  const [pending, start] = useTransition();
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const markLost = () =>
    start(async () => {
      await moveStageAction(job.id, "lost", { lostReason: `No reply after ${attempts} tries` });
      toast(`${job.name} marked lost`);
    });

  return (
    <>
      <div
        onClick={() => router.push(`/jobs/${job.id}`)}
        className="card card-hover relative flex cursor-pointer flex-col gap-2.5 p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="text-[17px] font-semibold tracking-[-0.01em]">{job.name}</div>
            <div className="text-sm text-ink2">{[job.contact, job.phoneDisplay].filter(Boolean).join(" · ")}</div>
          </div>
        </div>
        <div className="text-[15px] leading-snug text-pretty">{job.problem}</div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${TONE_CHIP[tone]}`}>{reason}</span>
          {job.amount && <span className="text-[15px] font-semibold tabular-nums">{job.amount}</span>}
        </div>

        {suggestLost && (
          <div onClick={stop} className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-ink2">
            <span>{attempts} tries, no reply.</span>
            <button type="button" disabled={pending} onClick={markLost} className="font-semibold text-clay-ink underline underline-offset-2">
              Mark as lost?
            </button>
          </div>
        )}

        <div className="mt-0.5 flex gap-2" onClick={stop}>
          {job.phone ? (
            <>
              {/* Dial, and have the "how did it go?" sheet waiting when she comes back. */}
              <a href={`tel:${job.phone}`} onClick={() => setTimeout(() => setSheet("call"), 400)} className="btn-primary h-12 flex-1 text-base">
                Call
              </a>
              {/* Opens her Messages app with a ready-to-send text; "Texted" is pre-selected when she comes back. */}
              <a href={smsHref(job.phone, job.textBody)} onClick={() => setTimeout(() => setSheet("text"), 400)} className="btn-secondary h-12 flex-1 text-base">
                Text
              </a>
            </>
          ) : job.email ? (
            <a href={`mailto:${job.email}`} onClick={() => setTimeout(() => setSheet("log"), 400)} className="btn-primary h-12 flex-1 text-base">
              Email
            </a>
          ) : (
            <button type="button" onClick={() => setSheet("log")} className="btn-secondary h-12 flex-1 text-base">
              Log contact
            </button>
          )}
          <button
            type="button"
            aria-label="More actions"
            onClick={() => setMenu((m) => !m)}
            className="btn-secondary h-12 w-12 flex-none text-lg tracking-[1px] text-ink2"
          >
            ···
          </button>
        </div>

        {menu && (
          <div onClick={stop} className="absolute right-3 bottom-[68px] z-10 flex w-[200px] flex-col rounded-[14px] border border-line bg-surface p-1.5 shadow-[var(--shadow-lift)]">
            <button type="button" onClick={() => { setMenu(false); setSheet("log"); }} className="flex h-11 items-center rounded-[10px] px-3 text-left text-[15px] font-medium hover:bg-muted">
              Log contact
            </button>
            <button type="button" onClick={() => { setMenu(false); setSheet("move"); }} className="flex h-11 items-center justify-between rounded-[10px] px-3 text-left text-[15px] font-medium hover:bg-muted">
              Move stage <span className="text-ink2">›</span>
            </button>
            <button type="button" onClick={() => { setMenu(false); setSheet("snooze"); }} className="flex h-11 items-center justify-between rounded-[10px] px-3 text-left text-[15px] font-medium hover:bg-muted">
              Remind me later <span className="text-ink2">›</span>
            </button>
          </div>
        )}
      </div>

      {(sheet === "log" || sheet === "call" || sheet === "text") && (
        <LogSheet
          job={job}
          title={sheet === "call" ? "How did the call go?" : sheet === "text" ? "Did you send the text?" : "Log contact"}
          initialKind={sheet === "text" ? "texted" : undefined}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "move" && <MoveSheet job={job} onClose={() => setSheet(null)} />}
      {sheet === "snooze" && <SnoozeSheet job={job} onClose={() => setSheet(null)} />}
    </>
  );
}
