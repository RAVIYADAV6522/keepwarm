"use client";

import { useActionState, useState } from "react";
import { login } from "./actions";

export function LoginForm({ next, demoPasscode }: { next: string; demoPasscode?: string }) {
  const [state, action, pending] = useActionState(login, null);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-2">
        <span className="text-[12px] font-semibold tracking-[0.08em] text-[#9aa3b8] uppercase">Passcode</span>
        <span className="login-input flex h-14 items-center gap-3 rounded-2xl border border-white/10 bg-[#070a12]/80 px-4 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-[#c9a35b]" aria-hidden="true">
            <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
          </svg>
          <input
            name="passcode"
            type={show ? "text" : "password"}
            defaultValue={demoPasscode}
            autoComplete="current-password"
            aria-invalid={!!state?.error}
            className="h-full min-w-0 flex-1 bg-transparent text-[17px] tracking-[0.04em] text-[#eef1f8] outline-none placeholder:text-[#5d6476]"
            placeholder="Your passcode"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="flex-none text-[13px] font-semibold text-[#9aa3b8] hover:text-[#eef1f8]"
            aria-label={show ? "Hide passcode" : "Show passcode"}
          >
            {show ? "Hide" : "Show"}
          </button>
        </span>
      </label>

      {demoPasscode && (
        <p className="rounded-xl border border-[#c9a35b]/20 bg-[#c9a35b]/[0.07] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#c9cfdc]">
          <span className="mr-2 inline-block rounded-md bg-[#c9a35b]/20 px-1.5 py-0.5 align-[1px] text-[11px] leading-none font-bold tracking-[0.06em] text-[#dcbb7a] uppercase">
            Demo
          </span>
          Passcode <span className="font-semibold text-[#eef1f8]">{demoPasscode}</span> is filled in for you.
        </p>
      )}

      {state?.error && (
        <div role="alert" className="rounded-xl bg-[#e8838a]/10 px-3.5 py-2.5 text-[14px] text-[#f0a0a6]">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="login-button group relative mt-1 flex h-14 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-[#e6c785] to-[#b08a45] text-[17px] font-semibold text-[#141a2b] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_12px_30px_-8px_rgba(201,163,91,0.55)] transition-transform active:translate-y-px disabled:opacity-70"
      >
        {pending ? "Opening…" : "Open KeepWarm"}
        {!pending && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        )}
      </button>
    </form>
  );
}
