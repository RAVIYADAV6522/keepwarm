"use client";

import { useEffect, useState } from "react";

// A tiny confirmation toast. Anything can call toast("Saved") — no state library needed.
type Toast = { message: string; error?: boolean };

export function toast(message: string, opts: { error?: boolean } = {}) {
  window.dispatchEvent(new CustomEvent<Toast>("keepwarm:toast", { detail: { message, error: opts.error } }));
}

// Saves feel instant: the sheet closes and the toast shows straight away while the server catches up.
// Only if the save fails do we say so.
export function inBackground<T>(work: Promise<T>, onDone?: (result: T) => void) {
  work.then(onDone, () => toast("Couldn't save. Check your connection and try again.", { error: true }));
}

export function Toaster() {
  const [current, setCurrent] = useState<Toast | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setCurrent((e as CustomEvent<Toast>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setCurrent(null), 3500);
    };
    window.addEventListener("keepwarm:toast", onToast);
    return () => {
      window.removeEventListener("keepwarm:toast", onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!current) return null;
  return (
    <div
      role={current.error ? "alert" : "status"}
      className="fixed left-1/2 bottom-[104px] lg:bottom-8 z-50 flex h-14 w-[calc(100%-40px)] max-w-[440px] -translate-x-1/2 items-center gap-2.5 rounded-[14px] border border-white/10 bg-[#0e1220] px-[18px] text-[15px] font-medium text-[#eef1f8] shadow-[0_14px_36px_rgba(14,18,32,.35)]"
    >
      <span
        className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-xs font-bold text-white ${current.error ? "bg-[#e5484d]" : "bg-[#10b981]"}`}
      >
        {current.error ? "!" : "✓"}
      </span>
      <span className="truncate">{current.message}</span>
    </div>
  );
}
