"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { disconnectGmailAction, dismissInboxAction, loadSampleEmailsAction, syncGmailAction } from "@/app/actions";
import { inBackground, toast } from "./toast";

const enquiries = (n: number) => `${n} new ${n === 1 ? "enquiry" : "enquiries"} from email`;

// Say exactly what "Check now" found, so an older item still waiting for review doesn't look like a bug.
function checkSummary(r: { scanned: number; pending: number; auto: number }): string {
  if (r.scanned === 0) return "No new emails since the last check";
  const found = [r.pending ? `${r.pending} to review` : "", r.auto ? `${r.auto} added straight to Today` : ""].filter(Boolean).join(" · ");
  if (found) return `${enquiries(r.pending + r.auto)}: ${found}`;
  return `Checked ${r.scanned} new ${r.scanned === 1 ? "email" : "emails"}, none ${r.scanned === 1 ? "was a job enquiry" : "were job enquiries"}`;
}

// Mounted in the app layout when Gmail is connected: checks for new mail each time she opens the app
// (the server skips it if it checked in the last 2 minutes).
export function MailSync() {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    syncGmailAction()
      .then((r) => {
        if (r.pending) toast(`${enquiries(r.pending)} to review`);
        else if (r.auto) toast(`${r.auto} email ${r.auto === 1 ? "reply" : "replies"} added to your jobs`);
      })
      .catch(() => {});
  }, []);
  return null;
}

export function CheckNowButton() {
  const [pending, start] = useTransition();
  const check = () =>
    start(async () => {
      const r = await syncGmailAction(true);
      if (r.error) toast(r.error, { error: true });
      else toast(checkSummary(r));
    });
  return (
    <button type="button" disabled={pending} onClick={check} className="btn-secondary h-10 px-4 text-sm">
      {pending ? "Checking…" : "Check now"}
    </button>
  );
}

export function DisconnectButton() {
  const disconnect = () => {
    if (!window.confirm("Disconnect Gmail? KeepWarm will stop checking your email. Jobs already added stay.")) return;
    inBackground(disconnectGmailAction(), () => toast("Gmail disconnected"));
  };
  return (
    <button type="button" onClick={disconnect} className="h-10 px-2 text-sm font-medium text-ink2 underline underline-offset-2 hover:text-ink">
      Disconnect
    </button>
  );
}

export function DismissButton({ id }: { id: number }) {
  const router = useRouter();
  const dismiss = () => {
    toast("Marked as not a job");
    inBackground(dismissInboxAction(id), () => router.refresh());
  };
  return (
    <button type="button" onClick={dismiss} className="btn-secondary h-11 flex-1 text-[15px]">
      Not a job
    </button>
  );
}

export function SampleEmailsButton() {
  const [pending, start] = useTransition();
  const load = () =>
    start(async () => {
      const outcomes = await loadSampleEmailsAction();
      const count = (o: string) => outcomes.filter((x) => x === o).length;
      toast(`${count("pending")} to review · ${count("auto")} added straight to Today · ${count("ignored")} skipped`);
    });
  return (
    <button type="button" disabled={pending} onClick={load} className="btn-secondary h-11 px-4 text-[15px]">
      {pending ? "Loading…" : "Load sample emails"}
    </button>
  );
}
