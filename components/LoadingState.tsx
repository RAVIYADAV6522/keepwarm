"use client";

import { useEffect, useState } from "react";
import { Mascot } from "./Mascot";

const MESSAGES = ["Warming up your list…", "Checking who needs a call…", "Counting today's follow-ups…", "Fetching your jobs…"];

// Shown while a page's data is on its way. If it's taking unusually long, say so and offer a retry.
export function LoadingState() {
  const [i, setI] = useState(0);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const tick = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 1800);
    const late = setTimeout(() => setSlow(true), 8000);
    return () => {
      clearInterval(tick);
      clearTimeout(late);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 px-5 text-center text-ink2">
      <Mascot />
      <p key={i} className="fade-in font-serif text-[22px] text-ink">
        {MESSAGES[i]}
      </p>
      <div className="flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((d) => (
          <span key={d} className="loading-dot h-2 w-2 rounded-full bg-accent" style={{ animationDelay: `${d * 0.18}s` }} />
        ))}
      </div>
      {slow && (
        <div className="fade-in mt-2 flex max-w-[340px] flex-col items-center gap-3">
          <p className="text-[15px] leading-normal">This is taking longer than usual. Your connection might be slow.</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-secondary h-11 px-5 text-[15px]">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
