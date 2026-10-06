"use client";

import Link from "next/link";
import { Mascot } from "./Mascot";
import { useOnline } from "./useOnline";

// When a page's data can't be loaded (bad connection, server hiccup): explain, reassure, offer a retry.
export function LoadError({ retry, home = true }: { retry: () => void; home?: boolean }) {
  const offline = !useOnline();

  return (
    <div role="alert" className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-5 text-center text-ink2">
      <Mascot mood="sleepy" />
      <h1 className="font-serif text-[28px] leading-tight text-ink">{offline ? "You're offline" : "We couldn't load this right now"}</h1>
      <p className="max-w-[360px] text-[15px] leading-normal">
        {offline
          ? "Check your Wi-Fi or mobile data, then try again. Nothing you saved has been lost."
          : "It might be a slow connection or a hiccup on our side. Your jobs and notes are safe."}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2.5">
        <button type="button" onClick={retry} className="btn-primary h-12 px-6 text-base">
          Try again
        </button>
        {home && (
          <Link href="/" className="btn-secondary h-12 px-6 text-base">
            Back to Today
          </Link>
        )}
      </div>
    </div>
  );
}
