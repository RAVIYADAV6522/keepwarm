"use client";

import { useState, useTransition } from "react";
import { setCustomerNoteAction } from "@/app/actions";
import { toast } from "./toast";

// The note that matters every visit: door codes, who to ask for, when they're open.
export function CustomerNote({ customerId, initial }: { customerId: number; initial: string }) {
  const [note, setNote] = useState(initial);
  const [pending, start] = useTransition();
  const changed = note.trim() !== initial.trim();

  const save = () =>
    start(async () => {
      await setCustomerNoteAction(customerId, note);
      toast("Note saved");
    });

  return (
    <div className="card flex flex-col gap-2.5 p-4">
      <span className="field-label">Pinned note</span>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Door codes, who to ask for, opening hours…"
        className="min-h-20 resize-none rounded-[14px] border border-line bg-bg p-3 text-base leading-snug outline-none focus:border-accent"
      />
      {changed && (
        <button type="button" disabled={pending} onClick={save} className="btn-primary h-11 w-fit px-5 text-[15px]">
          {pending ? "Saving…" : "Save note"}
        </button>
      )}
    </div>
  );
}
