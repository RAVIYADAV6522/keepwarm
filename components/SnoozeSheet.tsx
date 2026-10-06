"use client";

import { useState, useTransition } from "react";
import { snoozeAction } from "@/app/actions";
import { SNOOZE_LABEL, SNOOZE_OPTIONS, type SnoozeOption } from "@/lib/constants";
import type { SheetJob } from "./LogSheet";
import { Sheet } from "./Sheet";
import { toast } from "./toast";

// "Call me next week": take the job off Today until the day she picks.
export function SnoozeSheet({ job, onClose }: { job: SheetJob; onClose: () => void }) {
  const [date, setDate] = useState("");
  const [pending, start] = useTransition();

  const snooze = (choice: SnoozeOption | { date: string }) =>
    start(async () => {
      const until = await snoozeAction(job.id, choice);
      toast(`${job.name} · back on ${until}`);
      onClose();
    });

  return (
    <Sheet title="Remind me later" subtitle={[job.name, job.contact].filter(Boolean).join(" · ")} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2.5">
        {SNOOZE_OPTIONS.map((o) => (
          <button
            key={o}
            type="button"
            disabled={pending}
            onClick={() => snooze(o)}
            className="h-[60px] rounded-[14px] border-[1.5px] border-line text-base font-semibold hover:border-accent hover:bg-clay hover:text-clay-ink"
          >
            {SNOOZE_LABEL[o]}
          </button>
        ))}
      </div>
      <div className="flex gap-2.5">
        <input
          type="date"
          aria-label="Pick a date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-[52px] min-w-0 flex-1 rounded-[14px] border border-line bg-bg px-4 text-base outline-none focus:border-accent"
        />
        <button type="button" disabled={!date || pending} onClick={() => snooze({ date })} className="btn-primary h-[52px] px-5 text-base">
          Remind me
        </button>
      </div>
      <p className="-mt-1 text-sm text-ink2">It leaves today&apos;s list and comes back at 9am that day. If they get in touch first, it comes back straight away.</p>
    </Sheet>
  );
}
