"use client";

import { useEffect, type ReactNode } from "react";

// Bottom sheet on phones, centred dialog on desktop.
export function Sheet({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(20,20,19,.38)] lg:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className="flex max-h-[92dvh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-t-[22px] bg-surface px-5 pt-2.5 pb-8 shadow-[0_-10px_40px_rgba(20,20,19,.15)] lg:rounded-[22px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[5px] w-10 self-center rounded-full bg-line" />
        <div className="flex flex-col gap-0.5">
          <div className="font-serif text-[26px]">{title}</div>
          {subtitle && <div className="text-[15px] text-ink2">{subtitle}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
