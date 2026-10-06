import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import type { Source } from "./constants";
import { intake, type IntakeResult } from "./intake";

// Shared plumbing for the inbound webhooks.

// Webhooks must carry ?token=INBOUND_TOKEN. Locally (no token configured) the check is skipped.
export function tokenOk(req: Request): boolean {
  const expected = process.env.INBOUND_TOKEN;
  if (!expected) return true;
  return new URL(req.url).searchParams.get("token") === expected;
}

// Accept JSON or form posts (Twilio and plain HTML forms send form-encoded bodies).
export async function readBody(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const json = await req.json().catch(() => ({}));
    return Object.fromEntries(Object.entries(json ?? {}).map(([k, v]) => [k, v == null ? "" : String(v)]));
  }
  const form = await req.formData().catch(() => null);
  return form ? Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) : {};
}

export function pick(body: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) if (body[k]?.trim()) return body[k].trim();
  return "";
}

export async function runIntake(raw: string, source: Source, overrides?: Parameters<typeof intake>[3]) {
  const result = await intake(await getDb(), raw, source, overrides);
  revalidatePath("/", "layout");
  return result;
}

export function summary(result: IntakeResult) {
  return {
    outcome: result.outcome,
    jobId: "job" in result ? result.job.id : null,
    method: result.extracted.method,
    extracted: result.extracted,
    alerted: result.outcome === "created" ? result.alerted : false,
  };
}

export const unauthorized = () => Response.json({ error: "Bad or missing token" }, { status: 401 });
