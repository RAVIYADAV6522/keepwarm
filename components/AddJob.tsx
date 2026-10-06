"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { matchCustomerAction, saveJobAction } from "@/app/actions";
import { EQUIPMENT, SOURCES, URGENCY, type Equipment, type Source, type Urgency } from "@/lib/constants";
import { EQUIPMENT_LABEL, plural, SOURCE_LABEL, URGENCY_LABEL } from "@/lib/format";
import type { CustomerMatch } from "@/lib/match";
import { formatPhone } from "@/lib/phone";
import { toast } from "./toast";

export type Fields = {
  businessName: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  problem: string;
  equipment: Equipment;
  urgency: Urgency;
  source: Source;
};

const EMPTY: Fields = { businessName: "", customerName: "", phone: "", email: "", address: "", problem: "", equipment: "other", urgency: "routine", source: "call" };

// Best guess at which door the pasted text came through; she can change it.
function guessSource(raw: string): Source {
  if (/contact form|form submission|website form/i.test(raw)) return "web_form";
  if (/^(from|subject|to):/im.test(raw) || /\n\n(thanks|regards|best),?\n/i.test(raw)) return "email";
  return "call";
}

const URGENCY_ON: Record<Urgency, string> = {
  emergency: "bg-red-s text-red border-red",
  soon: "bg-amber-s text-amber border-amber",
  routine: "bg-surface text-ink border-line",
};

// Reviewing an email from the Inbox: the same preview, already filled in from the email.
export type FromInbox = { inboxId: number; raw: string; fields: Fields; match: CustomerMatch | null; method: "claude" | "rules" | null; from: string };

export function AddJob({ fromInbox }: { fromInbox?: FromInbox }) {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "loading" | "preview">(fromInbox ? "preview" : "input");
  const [raw, setRaw] = useState(fromInbox?.raw ?? "");
  const [f, setF] = useState<Fields>(fromInbox?.fields ?? EMPTY);
  const [match, setMatch] = useState<CustomerMatch | null>(fromInbox?.match ?? null);
  const [method, setMethod] = useState<"claude" | "rules" | null>(fromInbox?.method ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((x) => ({ ...x, [k]: v }));

  const organize = async () => {
    if (!raw.trim()) return;
    setStep("loading");
    setError(null);
    try {
      const source = guessSource(raw);
      const res = await fetch("/api/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ raw, source }) });
      if (!res.ok) throw new Error("Could not read that message");
      const { extracted: x, match } = await res.json();
      setF({
        businessName: x.business_name ?? "",
        customerName: x.customer_name ?? "",
        phone: formatPhone(x.phone) || "",
        email: x.email ?? "",
        address: x.address ?? "",
        problem: x.problem ?? "",
        equipment: x.equipment,
        urgency: x.urgency,
        source,
      });
      setMatch(match);
      setMethod(x.method);
    } catch {
      // Never lose what she typed: drop into the manual form with the text kept as the original message.
      setF({ ...EMPTY, problem: raw.slice(0, 90) });
      setError("Couldn't organize that automatically — fill in what you can.");
    }
    setStep("preview");
  };

  const manual = () => {
    setF(EMPTY);
    setMatch(null);
    setMethod(null);
    setStep("preview");
  };

  const rematch = async () => setMatch(await matchCustomerAction(f.phone, f.email));

  const save = (attachToJobId?: number) =>
    start(async () => {
      setError(null);
      try {
        const nul = (s: string) => s.trim() || null;
        const result = await saveJobAction(
          {
            businessName: nul(f.businessName),
            customerName: nul(f.customerName),
            phone: nul(f.phone),
            email: nul(f.email),
            address: nul(f.address),
            problem: f.problem,
            equipment: f.equipment,
            urgency: f.urgency,
            source: f.source,
          },
          raw,
          attachToJobId,
          fromInbox?.inboxId,
        );
        if ("error" in result) {
          setError(result.error ?? "Could not save");
          return;
        }
        const who = f.businessName || f.customerName || "Job";
        toast(result.attached ? `Added to ${who}'s open job` : `Saved · ${who} is on your Today list`);
        router.push(result.attached ? `/jobs/${result.jobId}` : "/");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });

  const fields: { key: keyof Fields; label: string; ph: string; type?: string }[] = [
    { key: "businessName", label: "Business", ph: "e.g. Tony's Diner" },
    { key: "customerName", label: "Contact", ph: "Who to ask for" },
    { key: "phone", label: "Phone", ph: "(312) 555-0142", type: "tel" },
    { key: "email", label: "Email", ph: "optional", type: "email" },
    { key: "address", label: "Address", ph: "optional" },
    { key: "problem", label: "Problem", ph: "Walk-in freezer down" },
  ];

  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[30px]">{fromInbox ? "Review email" : step === "preview" ? "Check the details" : "New job"}</h1>
        <button type="button" aria-label="Close" onClick={() => router.back()} className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-xl text-ink2">
          ×
        </button>
      </div>

      {step === "input" && (
        <div className="flex flex-col gap-4">
          <textarea
            autoFocus
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste a text or email, or just type what they said…"
            className="h-[320px] resize-none rounded-2xl border-[1.5px] border-accent bg-surface p-[18px] text-[19px] leading-normal shadow-[0_0_0_4px_var(--clay)] outline-none"
          />
          <div className="flex items-start gap-2.5 px-1 text-sm leading-snug text-ink2">
            <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-accent" />
            Rather talk? Tap the mic on your keyboard and say it out loud.
          </div>
          <button type="button" disabled={!raw.trim()} onClick={organize} className="btn-primary h-14 text-[17px]">
            Organize it ✨
          </button>
          <button type="button" onClick={manual} className="h-11 text-[15px] font-medium text-clay-ink underline underline-offset-[3px]">
            Fill in manually
          </button>
        </div>
      )}

      {step === "loading" && (
        <div className="flex flex-col gap-4">
          <div className="card p-[18px] text-[17px] leading-normal whitespace-pre-wrap">{raw}</div>
          <div className="card flex flex-col gap-3.5 p-[18px]">
            <div className="flex items-center gap-2.5 text-[15px] font-medium text-ink2">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-accent" style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </span>
              Reading the message…
            </div>
            <div className="h-3.5 w-3/5 rounded-md bg-muted" />
            <div className="h-3.5 w-[85%] rounded-md bg-muted" />
            <div className="h-3.5 w-[45%] rounded-md bg-muted" />
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="flex flex-col gap-4">
          <div className="-mt-2 text-[15px] text-ink2">
            {fromInbox && <>From {fromInbox.from}. </>}
            Tap anything to fix it.{method === "rules" && raw ? " (Quick read — double-check the details.)" : ""}
          </div>

          {match && (
            <div className="flex flex-col gap-1 rounded-[14px] bg-green-s px-4 py-3.5">
              <span className="text-[15px] font-semibold text-green">Repeat customer found</span>
              <span className="text-sm">
                {match.name} · {plural(match.pastJobs, "past job")}
              </span>
              {match.openJob && (
                <div className="mt-2 flex flex-col gap-2 border-t border-green/20 pt-2.5">
                  <span className="text-sm">
                    They already have an open job: <strong>{match.openJob.problem}</strong> ({match.openJob.stage}).
                  </span>
                  <button type="button" disabled={saving} onClick={() => save(match.openJob!.id)} className="btn-secondary h-11 text-[15px]">
                    Add this to that job instead
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="card overflow-hidden">
            {fields.map((field) => (
              <label key={field.key} className="flex flex-col gap-[3px] border-b border-line px-4 py-2.5">
                <span className="field-label">{field.label}</span>
                {field.key === "problem" ? (
                  <textarea
                    rows={2}
                    value={f.problem}
                    onChange={(e) => set("problem", e.target.value)}
                    placeholder={field.ph}
                    className="resize-none bg-transparent py-0.5 text-base leading-snug outline-none placeholder:text-ink2/60"
                  />
                ) : (
                  <input
                    type={field.type ?? "text"}
                    value={f[field.key]}
                    onChange={(e) => set(field.key, e.target.value as never)}
                    onBlur={field.key === "phone" || field.key === "email" ? rematch : undefined}
                    placeholder={field.ph}
                    className="bg-transparent py-0.5 text-base leading-snug outline-none placeholder:text-ink2/60"
                  />
                )}
              </label>
            ))}
            <div className="flex flex-col gap-2 border-b border-line px-4 py-3">
              <span className="field-label">Urgency</span>
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted p-1">
                {URGENCY.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => set("urgency", u)}
                    className={`h-10 rounded-[9px] border text-[15px] font-semibold ${f.urgency === u ? URGENCY_ON[u] : "border-transparent text-ink2"}`}
                  >
                    {URGENCY_LABEL[u]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2">
              <label className="flex flex-col gap-[3px] border-r border-line px-4 py-2.5">
                <span className="field-label">Equipment</span>
                <select value={f.equipment} onChange={(e) => set("equipment", e.target.value as Equipment)} className="bg-transparent py-0.5 text-base outline-none">
                  {EQUIPMENT.map((x) => (
                    <option key={x} value={x}>{EQUIPMENT_LABEL[x]}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-[3px] px-4 py-2.5">
                <span className="field-label">Came in by</span>
                <select value={f.source} onChange={(e) => set("source", e.target.value as Source)} className="bg-transparent py-0.5 text-base outline-none">
                  {SOURCES.map((x) => (
                    <option key={x} value={x}>{SOURCE_LABEL[x]}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error && <div className="rounded-xl bg-red-s px-4 py-3 text-sm text-red">{error}</div>}

          <button type="button" disabled={saving || !f.problem.trim()} onClick={() => save()} className="btn-primary h-14 text-[17px]">
            {saving ? "Saving…" : match?.openJob ? "Save as a new job" : "Save job"}
          </button>
          <button type="button" onClick={() => setStep("input")} className="h-11 text-[15px] font-medium text-clay-ink underline underline-offset-[3px]">
            Back to the message
          </button>
        </div>
      )}
    </div>
  );
}
