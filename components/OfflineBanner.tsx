"use client";

import { useOnline } from "./useOnline";

// A small heads-up when the phone loses signal, so a slow page doesn't look like a broken one.
export function OfflineBanner() {
  if (useOnline()) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 bg-[#0e1220] px-4 py-2 text-center text-sm font-medium text-[#eef1f8]">
      You&apos;re offline. KeepWarm will catch up when you&apos;re back online.
    </div>
  );
}
