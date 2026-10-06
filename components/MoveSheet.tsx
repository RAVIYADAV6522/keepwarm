"use client";

import { useState, useTransition } from "react";
import { moveStageAction } from "@/app/actions";
import { STAGES, type Stage } from "@/lib/constants";
import { STAGE_LABEL } from "@/lib/format";
import type { SheetJob } from "./LogSheet";
import { Sheet } from "./Sheet";
import { toast } from "./toast";

export function MoveSheet({ job, onClose }: { job: SheetJob; onClose: () => void }) {
  const [picked, setPicked] = useState<Stage | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [pending, start] = useTransition();

  const move = (stage: Stage, opts: { lostReason?: string; visitDate?: string } = {}) =>
    start(async () => {
      await moveStageAction(job.id, stage, opts);
      toast(`${job.name} → ${STAGE_LABEL[stage]}`);
      onClose();
    });

  const choose = (stage: Stage) => {
    if (stage === job.stage) return onClose();
    if (stage === "lost" || stage === "scheduled") return setPicked(stage); // ask one more thing first
    move(stage);
  };

  return (
    <Sheet title="Move stage" subtitle={[job.name, job.contact].filter(Boolean).join(" · ")} onClose={onClose}>
      {picked === "lost" ? (
        <div className="flex flex-col gap-3">
          <input
            autoFocus
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            placeholder="Why? e.g. went with someone else (optional)"
            className="h-[52px] rounded-[14px] border border-line bg-bg px-4 text-base outline-none"
          />
          <button type="button" disabled={pending} onClick={() => move("lost", { lostReason })} className="btn-primary h-14 text-[17px]">
            Mark as lost
          </button>
        </div>
      ) : picked === "scheduled" ? (
        <div className="flex flex-col gap-3">
          <label className="flex h-[52px] items-center justify-between rounded-[14px] border border-line bg-bg px-4">
            <span className="text-[15px] text-ink2">Visit date</span>
            <input type="date" autoFocus value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="bg-transparent text-base font-medium text-blue outline-none" />
          </label>
          <button type="button" disabled={pending} onClick={() => move("scheduled", { visitDate })} className="btn-primary h-14 text-[17px]">
            {visitDate ? "Schedule" : "Schedule without a date"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {STAGES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => choose(s)}
              className={`flex h-[52px] items-center justify-between rounded-xl px-4 text-left text-base font-medium hover:bg-muted ${
                s === job.stage ? "bg-clay text-clay-ink" : "text-ink"
              }`}
            >
              {STAGE_LABEL[s]}
              <span className="font-bold">{s === job.stage ? "✓" : ""}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
