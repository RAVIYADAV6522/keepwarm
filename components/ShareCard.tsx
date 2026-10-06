"use client";

import { useTransition } from "react";
import { createShareAction, revokeShareAction } from "@/app/actions";
import { toast } from "./toast";

// "My husband keeps asking me for numbers": a read-only link she can text him, plus CSV downloads.
export function ShareCard({ token, baseUrl }: { token: string | null; baseUrl: string }) {
  const [pending, start] = useTransition();
  const url = token ? `${baseUrl}/share/${token}` : "";

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Link copied");
    } catch {
      toast("Couldn't copy — select the link instead");
    }
  };
  const create = () =>
    start(async () => {
      const t = await createShareAction();
      await copy(`${baseUrl}/share/${t}`);
    });
  const revoke = () =>
    start(async () => {
      await revokeShareAction();
      toast("Link turned off");
    });

  return (
    <div className="card flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <div className="text-[15px] font-semibold">Share these numbers</div>
        <p className="text-sm text-ink2">
          A read-only link for your husband or bookkeeper. They see this page only, with no passcode, and can&apos;t change anything.
        </p>
      </div>
      {token ? (
        <div className="flex flex-col gap-2.5">
          <input
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
            aria-label="Share link"
            className="h-11 rounded-xl border border-line bg-bg px-3 text-sm text-ink2 outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(url)} className="btn-primary h-11 px-4 text-[15px]">
              Copy link
            </button>
            <a href={`sms:?&body=${encodeURIComponent(`Here are this month's numbers: ${url}`)}`} className="btn-secondary h-11 px-4 text-[15px]">
              Text it
            </a>
            <button type="button" disabled={pending} onClick={revoke} className="btn-secondary h-11 px-4 text-[15px] text-red">
              Turn off link
            </button>
          </div>
        </div>
      ) : (
        <button type="button" disabled={pending} onClick={create} className="btn-primary h-11 w-fit px-4 text-[15px]">
          {pending ? "Creating…" : "Create a read-only link"}
        </button>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3.5 text-sm">
        <span className="text-ink2">Download your data:</span>
        <a href="/api/export/jobs" download className="font-semibold text-clay-ink underline underline-offset-2">
          Jobs (CSV)
        </a>
        <a href="/api/export/customers" download className="font-semibold text-clay-ink underline underline-offset-2">
          Customers (CSV)
        </a>
      </div>
    </div>
  );
}
