"use client";

import { useEffect, useState } from "react";

// A tiny confirmation toast. Anything can call toast("Saved") — no state library needed.
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent("keepwarm:toast", { detail: message }));
}

export function Toaster() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 3500);
    };
    window.addEventListener("keepwarm:toast", onToast);
    return () => {
      window.removeEventListener("keepwarm:toast", onToast);
      clearTimeout(timer);
    };
  }, []);

  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 bottom-[104px] lg:bottom-8 z-50 flex h-14 w-[calc(100%-40px)] max-w-[440px] -translate-x-1/2 items-center gap-2.5 rounded-[14px] border border-white/10 bg-[#0e1220] px-[18px] text-[15px] font-medium text-[#eef1f8] shadow-[0_14px_36px_rgba(14,18,32,.35)]"
    >
      <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-[#10b981] text-xs text-white">✓</span>
      <span className="truncate">{message}</span>
    </div>
  );
}
