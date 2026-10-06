"use client";

import { useState, useTransition } from "react";
import { logContactAction } from "@/app/actions";
import { LOG_KINDS, LOG_LABEL, type LogKind } from "@/lib/constants";
import { Sheet } from "./Sheet";
import { toast } from "./toast";

export type SheetJob = { id: number; name: string; contact: string; phoneDisplay: string; stage: string; quoteDollars: string };

type Props = { job: SheetJob; title?: string; initialKind?: LogKind; onClose: () => void };

export function LogSheet({ job, title = "Log contact", initialKind, onClose }: Props) {
  const [kind, setKind] = useState<LogKind | null>(initialKind ?? null);
  const [note, setNote] = useState("");
  const [quote, setQuote] = useState(job.quoteDollars);
  const [pending, start] = useTransition();

  const save = () => {
    if (!kind) return;
    start(async () => {
      await logContactAction(job.id, kind, note, kind === "quote_sent" ? quote : undefined);
      toast(`${LOG_LABEL[kind]} · ${job.name}`);
      onClose();
    });
  };

  return (
    <Sheet title={title} subtitle={[job.name, job.contact, job.phoneDisplay].filter(Boolean).join(" · ")} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2.5">
        {LOG_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`h-[60px] rounded-[14px] border-[1.5px] text-base font-semibold ${
              kind === k ? "border-accent bg-clay text-clay-ink" : "border-line text-ink"
            }`}
          >
            {LOG_LABEL[k]}
          </button>
        ))}
      </div>
      {kind === "quote_sent" && (
        <label className="flex items-center justify-between gap-3 rounded-[14px] border border-line bg-bg px-4 py-3">
          <span className="text-[15px] text-ink2">Quote amount</span>
          <span className="flex items-center gap-0.5 text-lg font-semibold">
            $
            <input
              inputMode="decimal"
              autoFocus
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="0"
              className="w-28 bg-transparent text-right outline-none"
            />
          </span>
        </label>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note (optional)"
        className="min-h-24 resize-none rounded-[14px] border border-line bg-bg p-3.5 text-base leading-snug outline-none"
      />
      {kind === "voicemail" && <p className="-mt-2 text-sm text-ink2">We&apos;ll put them back on your list tomorrow morning.</p>}
      <button type="button" disabled={!kind || pending} onClick={save} className="btn-primary h-14 text-[17px]">
        {pending ? "Saving…" : "Save"}
      </button>
    </Sheet>
  );
}
