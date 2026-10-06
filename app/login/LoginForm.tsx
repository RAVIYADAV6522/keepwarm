"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ next, demoPasscode }: { next: string; demoPasscode?: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5">
        <span className="field-label">Passcode</span>
        <input name="passcode" type="password" defaultValue={demoPasscode} autoFocus autoComplete="current-password" className="h-12 rounded-xl border border-line bg-bg px-3.5 text-lg outline-none focus:border-accent" />
      </label>
      {demoPasscode && (
        <div className="text-sm text-ink2">
          Demo passcode: <span className="font-semibold text-ink">{demoPasscode}</span> (already filled in)
        </div>
      )}
      {state?.error && <div className="text-sm text-red">{state.error}</div>}
      <button type="submit" disabled={pending} className="btn-primary h-14 text-[17px]">
        {pending ? "Checking…" : "Open KeepWarm"}
      </button>
    </form>
  );
}
