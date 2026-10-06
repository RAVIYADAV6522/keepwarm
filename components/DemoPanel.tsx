"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { resetDemoAction, simulateAction } from "@/app/actions";
import type { DemoKind } from "@/lib/demo-samples";
import { EQUIPMENT_LABEL, URGENCY_LABEL } from "@/lib/format";
import { toast } from "./toast";

type Result = Awaited<ReturnType<typeof simulateAction>>;

const BUTTONS: { kind: DemoKind; label: string; hint: string }[] = [
  { kind: "webform", label: "Simulate web form", hint: "Someone fills in the contact form on her website" },
  { kind: "email", label: "Simulate email", hint: "An email lands in her inbox (alternates with a spam email)" },
  { kind: "sms", label: "Simulate customer text", hint: "A repeat customer replies to a quote — or a referral texts in" },
  { kind: "call", label: "Simulate missed call", hint: "A call she couldn't pick up, with or without a voicemail" },
];

const OUTCOME: Record<string, string> = {
  created: "New job created — it's on the Today list",
  attached: "Matched an existing customer — added to their open job",
  ignored: "Not a job request — logged, no job created",
};

export function DemoPanel() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [last, setLast] = useState<(Result & { kind: DemoKind }) | null>(null);
  const [pending, start] = useTransition();

  const run = (kind: DemoKind) =>
    start(async () => {
      const i = counts[kind] ?? 0;
      setCounts((c) => ({ ...c, [kind]: i + 1 }));
      const r = await simulateAction(kind, i);
      setLast({ ...r, kind });
    });

  const reset = () => {
    if (!window.confirm("Reset to the demo data? Every job, customer and note you've added will be replaced.")) return;
    start(async () => {
      await resetDemoAction();
      setLast(null);
      setCounts({});
      toast("Demo data reset");
    });
  };

  const x = last?.result?.extracted;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BUTTONS.map((b) => (
          <button key={b.kind} type="button" disabled={pending} onClick={() => run(b.kind)} className="card flex flex-col items-start gap-1 p-4 text-left transition-colors hover:border-accent disabled:opacity-60">
            <span className="text-[16px] font-semibold">{b.label}</span>
            <span className="text-sm text-ink2">{b.hint}</span>
          </button>
        ))}
      </div>

      {pending && <div className="text-[15px] text-ink2">Working…</div>}

      {last && !pending && (
        <div className="card flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[16px] font-semibold">{OUTCOME[last.result.outcome] ?? `HTTP ${last.status}: ${JSON.stringify(last.result)}`}</span>
            {last.result.jobId && (
              <Link href={`/jobs/${last.result.jobId}`} className="text-[15px] font-semibold text-clay-ink underline underline-offset-2">
                Open job ›
              </Link>
            )}
          </div>
          {x && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-ink2">Read by</dt>
              <dd>{last.result.method === "claude" ? "Claude" : "Built-in rules (no API key)"}</dd>
              <dt className="text-ink2">Who</dt>
              <dd>{[x.business_name, x.customer_name].filter(Boolean).join(" · ") || "—"}</dd>
              <dt className="text-ink2">Phone</dt>
              <dd>{x.phone ?? "—"}</dd>
              <dt className="text-ink2">Problem</dt>
              <dd>{x.problem}</dd>
              <dt className="text-ink2">Urgency</dt>
              <dd>
                {URGENCY_LABEL[x.urgency as keyof typeof URGENCY_LABEL]} · {EQUIPMENT_LABEL[x.equipment as keyof typeof EQUIPMENT_LABEL]}
              </dd>
              {last.result.alerted !== undefined && last.result.outcome === "created" && x.urgency === "emergency" && (
                <>
                  <dt className="text-ink2">Alert</dt>
                  <dd>{last.result.alerted ? "Emergency email sent" : "Emergency email logged to the server console (no RESEND_API_KEY)"}</dd>
                </>
              )}
            </dl>
          )}
          <details>
            <summary className="cursor-pointer text-sm text-ink2">Payload sent to /api/inbound/{last.kind}</summary>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(last.payload, null, 2)}</pre>
          </details>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/" className="btn-primary h-12 px-5 text-[15px]">See Today</Link>
        <Link href="/contact" className="btn-secondary h-12 px-5 text-[15px]">Open the public contact form</Link>
        <button type="button" disabled={pending} onClick={reset} className="btn-secondary h-12 px-5 text-[15px]">Reset demo data</button>
      </div>
    </div>
  );
}
