"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card flex flex-col gap-4 p-5">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1.5">
        <span className="field-label">Passcode</span>
        <input name="passcode" type="password" autoFocus autoComplete="current-password" className="h-12 rounded-xl border border-line bg-bg px-3.5 text-lg outline-none focus:border-accent" />
      </label>
      {state?.error && <div className="text-sm text-red">{state.error}</div>}
      <button type="submit" disabled={pending} className="btn-primary h-14 text-[17px]">
        {pending ? "Checking…" : "Open KeepWarm"}
      </button>
    </form>
  );
}
