"use client";

import Link from "next/link";
import { useState } from "react";
import { SOURCES, STAGES, type Source, type Stage } from "@/lib/constants";
import { SOURCE_LABEL, STAGE_LABEL, TONE_CHIP, type Tone } from "@/lib/format";

export type BoardJob = {
  id: number;
  name: string;
  contact: string;
  phone: string;
  problem: string;
  amount: string;
  stage: Stage;
  source: Source;
  meta: string;
  tone: Tone;
};

const digits = (s: string) => s.replace(/\D/g, "");

export function JobsBoard({ jobs }: { jobs: BoardJob[] }) {
  const [q, setQ] = useState("");
  const [src, setSrc] = useState<Source | "all">("all");
  const [showLost, setShowLost] = useState(false);
  const [tab, setTab] = useState<Stage>("new");

  const query = q.trim().toLowerCase();
  const filtered = jobs.filter(
    (j) =>
      (src === "all" || j.source === src) &&
      (!query ||
        [j.name, j.contact, j.problem].join(" ").toLowerCase().includes(query) ||
        (digits(query).length >= 3 && digits(j.phone).includes(digits(query)))),
  );
  const stages = STAGES.filter((s) => s !== "lost" || showLost);
  const inStage = (s: Stage) => filtered.filter((j) => j.stage === s);
  // Closed columns grow forever; show the most recent ones (search still finds the rest).
  const CLOSED_LIMIT = 12;
  const visible = (s: Stage) => (s === "done" || s === "lost" ? inStage(s).slice(0, CLOSED_LIMIT) : inStage(s));
  const hidden = (s: Stage) => inStage(s).length - visible(s).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-serif text-[clamp(30px,3.4vw,36px)]">All jobs</h1>
        <div className="flex w-full flex-wrap gap-2 lg:w-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone or problem"
            className="h-[46px] min-w-0 flex-[1_1_220px] rounded-xl border border-line bg-surface px-3.5 text-base outline-none focus:border-accent"
          />
          <select value={src} onChange={(e) => setSrc(e.target.value as Source | "all")} className="h-[46px] rounded-xl border border-line bg-surface px-3 text-[15px] font-medium">
            <option value="all">All sources</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setShowLost((v) => !v);
              if (showLost && tab === "lost") setTab("new");
            }}
            className={`h-[46px] rounded-xl border border-line px-3.5 text-[15px] font-medium ${showLost ? "bg-clay text-clay-ink" : "bg-surface text-ink2"}`}
          >
            {showLost ? "Hide lost" : "Show lost"}
          </button>
        </div>
      </div>

      {/* Desktop: one column per stage */}
      <div className="hidden overflow-x-auto pb-2 lg:block">
        <div className="grid items-start gap-3.5" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(190px, 1fr))` }}>
          {stages.map((s) => {
            const list = inStage(s);
            return (
              <div key={s} className="flex min-h-[200px] flex-col gap-2.5 rounded-2xl bg-muted p-3">
                <div className="flex items-center justify-between px-1 pt-1">
                  <span className="text-sm font-semibold">{STAGE_LABEL[s]}</span>
                  <span className="text-[13px] text-ink2">{list.length}</span>
                </div>
                {visible(s).map((j) => (
                  <Link key={j.id} href={`/jobs/${j.id}`} className="card-hover flex flex-col gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-3 shadow-[var(--shadow)]">
                    <span className="text-[15px] font-semibold">{j.name}</span>
                    <span className="text-[13.5px] leading-snug text-ink2">{j.problem}</span>
                    <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1.5">
                      <span className={`rounded-full px-2 py-[3px] text-xs font-medium ${TONE_CHIP[j.tone]}`}>{j.meta}</span>
                      <span className="text-sm font-semibold tabular-nums">{j.amount}</span>
                    </div>
                  </Link>
                ))}
                {list.length === 0 && <div className="px-1 py-2 text-[13px] text-ink2">Nothing here</div>}
                {hidden(s) > 0 && <div className="px-1 text-[13px] text-ink2">+{hidden(s)} older — search to find them</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Phone: stage tabs */}
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="no-scrollbar -mx-5 flex gap-[22px] overflow-x-auto border-b border-line px-5 whitespace-nowrap">
          {stages.map((s) => {
            const on = s === tab;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setTab(s)}
                className={`-mb-px flex h-12 flex-none items-center gap-[7px] border-b-2 text-[15px] font-semibold ${on ? "border-accent text-ink" : "border-transparent text-ink2"}`}
              >
                {STAGE_LABEL[s]}
                <span className={`rounded-full px-[7px] py-0.5 text-xs font-semibold ${on ? "bg-clay text-clay-ink" : "bg-muted text-ink2"}`}>{inStage(s).length}</span>
              </button>
            );
          })}
        </div>
        {visible(tab).map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="card flex flex-col gap-2 p-4">
            <div className="flex justify-between gap-3">
              <span className="text-[17px] font-semibold">{j.name}</span>
              <span className="text-base font-semibold tabular-nums">{j.amount}</span>
            </div>
            <div className="text-[15px] text-ink2">{[j.contact, j.problem].filter(Boolean).join(" · ")}</div>
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-1 text-[13px] font-medium ${TONE_CHIP[j.tone]}`}>{j.meta}</span>
              <span className="text-xl text-ink2">›</span>
            </div>
          </Link>
        ))}
        {inStage(tab).length === 0 && <div className="py-10 text-center text-[15px] text-ink2">No jobs here.</div>}
        {hidden(tab) > 0 && <div className="text-center text-[13px] text-ink2">+{hidden(tab)} older — search to find them</div>}
      </div>
    </div>
  );
}
