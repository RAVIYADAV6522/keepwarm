"use client";

import { useState, useOptimistic, useTransition } from "react";
import { moveStageAction, setFollowUpAction, setQuoteAction, setUrgencyAction, setVisitAction } from "@/app/actions";
import { URGENCY, type Stage, type Urgency } from "@/lib/constants";
import { STAGE_LABEL, URGENCY_LABEL } from "@/lib/format";
import { smsHref } from "@/lib/messages";
import type { CardJob } from "@/lib/view";
import { LogSheet } from "./LogSheet";
import { MoveSheet } from "./MoveSheet";
import { toast } from "./toast";

type Sheet = null | "log" | "call" | "text" | "move" | "lost" | "scheduled";

// Call / Text / Log contact / Move stage for the job detail page.
export function useJobSheets(job: CardJob) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const close = () => setSheet(null);
  const node =
    sheet === "log" || sheet === "call" || sheet === "text" ? (
      <LogSheet
        job={job}
        title={sheet === "call" ? "How did the call go?" : sheet === "text" ? "Did you send the text?" : "Log contact"}
        initialKind={sheet === "text" ? "texted" : undefined}
        onClose={close}
      />
    ) : sheet ? (
      <MoveSheet job={job} initial={sheet === "lost" || sheet === "scheduled" ? sheet : null} onClose={close} />
    ) : null;
  return { open: setSheet, node };
}

export function DetailHeaderActions({ job }: { job: CardJob }) {
  const { open, node } = useJobSheets(job);
  return (
    <>
      <div className="flex gap-2">
        {job.phone ? (
          <>
            <a href={`tel:${job.phone}`} onClick={() => setTimeout(() => open("call"), 400)} className="btn-primary h-[52px] flex-1 text-[17px]">
              Call {job.contact.split(" ")[0] || ""}
            </a>
            <a href={smsHref(job.phone, job.textBody)} onClick={() => setTimeout(() => open("text"), 400)} className="btn-secondary h-[52px] flex-1 text-[17px]">
              Text
            </a>
          </>
        ) : job.email ? (
          <a href={`mailto:${job.email}`} onClick={() => setTimeout(() => open("log"), 400)} className="btn-primary h-[52px] flex-1 text-[17px]">
            Email
          </a>
        ) : null}
      </div>
      {job.phone && <SuggestedText text={job.textBody} />}
      <div className="flex gap-2">
        <button type="button" onClick={() => open("log")} className="btn-secondary h-11 flex-1 text-[15px]">
          + Log contact
        </button>
        <button type="button" onClick={() => open("move")} className="btn-secondary h-11 flex-1 text-[15px]">
          Move stage
        </button>
      </div>
      {node}
    </>
  );
}

// The text the Text button will open with, so she can see it (or copy it on a computer) first.
function SuggestedText({ text }: { text: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Text copied");
    } catch {
      toast("Couldn't copy — select the text instead");
    }
  };
  return (
    <div className="flex flex-col gap-2 rounded-[14px] bg-muted px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="field-label">Ready-to-send text</span>
        <button type="button" onClick={copy} className="text-sm font-semibold text-clay-ink underline underline-offset-2">
          Copy
        </button>
      </div>
      <p className="text-[15px] leading-snug text-pretty">{text}</p>
    </div>
  );
}

const TRACK: Stage[] = ["waiting_on_quote", "waiting_on_yes", "said_yes", "scheduled", "done"];

export function StageStepper({ job }: { job: CardJob }) {
  const { open, node } = useJobSheets(job);
  const [pending, start] = useTransition();
  // Move the stepper the moment she taps; the server confirms a beat later.
  const [stage, setStage] = useOptimistic(job.stage);
  const idx = TRACK.indexOf(stage);
  const fill = idx <= 0 ? 0 : (idx / (TRACK.length - 1)) * 100;

  const go = (next: Stage) => {
    if (next === stage) return;
    if (next === "scheduled") return open("scheduled");
    toast(`Moved to ${STAGE_LABEL[next]}`);
    start(async () => {
      setStage(next);
      try {
        await moveStageAction(job.id, next);
      } catch {
        toast("Couldn't save. Check your connection and try again.");
      }
    });
  };

  const note =
    job.stage === "new"
      ? "New — not called yet. Tap a stage once you've talked to them."
      : job.stage === "lost"
        ? "Marked lost. Tap a stage to reopen."
        : "Tap a stage to move the job";

  return (
    <div className="card flex flex-col gap-3 px-3.5 pt-[18px] pb-3.5">
      <div className="relative grid grid-cols-5" aria-busy={pending}>
        <div className="absolute top-[13px] right-[10%] left-[10%] h-0.5 bg-line" />
        <div className="absolute top-[13px] left-[10%] h-0.5 bg-accent transition-[width] duration-300" style={{ width: `${fill * 0.8}%` }} />
        {TRACK.map((s, i) => {
          const done = i < idx || (i === idx && s === "done");
          const current = i === idx;
          return (
            <button key={s} type="button" onClick={() => go(s)} className="relative flex min-h-11 flex-col items-center gap-2 text-center">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[13px] font-bold text-white shadow-[0_0_0_4px_var(--surface)] ${
                  done ? "border-accent bg-accent" : current ? "border-accent bg-surface" : "border-line bg-surface"
                }`}
              >
                {done ? "✓" : ""}
              </span>
              <span className={`text-[12px] leading-tight ${current ? "font-semibold text-ink" : "text-ink2"}`}>{STAGE_LABEL[s].replace("Waiting on their", "Waiting on")}</span>
            </button>
          );
        })}
      </div>
      <div className="text-center text-[13px] text-ink2">{note}</div>
      {node}
    </div>
  );
}

export function QuoteField({ jobId, dollars }: { jobId: number; dollars: string }) {
  const [value, setValue] = useState(dollars);
  const save = () => {
    if (value === dollars) return;
    setQuoteAction(jobId, value).then(() => toast(value ? `Quote set to $${Number(value.replace(/[$,]/g, "")).toLocaleString("en-US")}` : "Quote cleared"));
  };
  return (
    <span className="flex items-center gap-0.5 text-[17px] font-semibold">
      $
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        placeholder="—"
        aria-label="Quote amount"
        className="w-24 bg-transparent text-right outline-none"
      />
    </span>
  );
}

export function DateField({ jobId, value, kind }: { jobId: number; value: string; kind: "follow_up" | "visit" }) {
  const action = kind === "visit" ? setVisitAction : setFollowUpAction;
  return (
    <span className="flex items-center gap-2">
      <input
        type="date"
        defaultValue={value}
        aria-label={kind === "visit" ? "Visit date" : "Next follow-up"}
        onChange={(e) => action(jobId, e.target.value).then(() => toast(e.target.value ? "Date saved" : "Date cleared"))}
        className={`bg-transparent text-right text-base font-medium outline-none ${kind === "visit" ? "text-blue" : "text-clay-ink"}`}
      />
    </span>
  );
}

const URGENCY_TONE: Record<Urgency, string> = {
  emergency: "border-red bg-red-s text-red",
  soon: "border-amber bg-amber-s text-amber",
  routine: "border-ink2 bg-muted text-ink",
};

export function UrgencyPicker({ jobId, value }: { jobId: number; value: Urgency }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1.5" aria-busy={pending}>
      {URGENCY.map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => u !== value && start(() => setUrgencyAction(jobId, u))}
          className={`h-[34px] rounded-full border px-3 text-[13.5px] font-semibold ${u === value ? URGENCY_TONE[u] : "border-line text-ink2"}`}
        >
          {URGENCY_LABEL[u]}
        </button>
      ))}
    </div>
  );
}
