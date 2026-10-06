import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { EQUIPMENT, URGENCY, type Source } from "./constants";
import { extractWithRules, type Extracted } from "./extract-rules";
import { normalizePhone } from "./phone";

// Text -> fields. This is the ONLY place the app uses AI.
// With ANTHROPIC_API_KEY set we ask Claude; on any error, timeout or invalid output we fall
// back to the rule-based extractor, so a lead is never dropped because a model call failed.

export type { Extracted } from "./extract-rules";
export type ExtractResult = Extracted & { method: "claude" | "rules" };

const Schema = z.object({
  is_job_request: z.boolean(),
  customer_name: z.string().nullable(),
  business_name: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  problem: z.string(),
  equipment: z.enum(EQUIPMENT),
  urgency: z.enum(URGENCY),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string().nullable(),
});

const SYSTEM = `You read incoming messages for Denise, who owns a commercial refrigeration repair company (walk-in coolers, walk-in freezers, reach-ins, ice machines) serving restaurants, grocery stores and warehouses. Messages arrive as texts, emails, website form submissions, call notes she typed, or voicemail transcripts.

Extract the fields. Rules:
- Use only what the message says. If a field is not there, return null. Never invent names, numbers or addresses.
- customer_name is the person; business_name is their restaurant/store/company.
- problem: a short plain-English summary Denise would write in her notebook, max 10 words, e.g. "Walk-in freezer down, product at risk".
- urgency:
  - emergency: equipment down or not cooling/freezing, temperature climbing, food or product at risk of spoiling, or they say urgent/asap/today.
  - soon: still working but something is wrong (running warm, noise, leak, icing up, ice machine slow), or they want it this week.
  - routine: maintenance, quotes for new equipment, no time pressure.
- is_job_request: false for spam, sales pitches, invoices, receipts, newsletters and anything that is not a customer asking for refrigeration work. True for any customer asking for a repair, visit, quote, or replying about an existing job.
- confidence: how sure you are about the contact details and problem.
- notes: anything else Denise should know (access hours, which unit, who to ask for), or null.`;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
const TIMEOUT_MS = 10_000;

let client: Anthropic | null = null;

async function extractWithClaude(raw: string, hint?: Source): Promise<Extracted> {
  client ??= new Anthropic({ timeout: TIMEOUT_MS, maxRetries: 1 });
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    temperature: 0,
    system: SYSTEM,
    messages: [{ role: "user", content: `Source: ${hint ?? "unknown"}\n\nMessage:\n${raw}` }],
    output_config: { format: zodOutputFormat(Schema) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`No structured output (stop_reason: ${response.stop_reason})`);
  }
  const out = Schema.parse(response.parsed_output);
  return { ...out, phone: normalizePhone(out.phone), problem: out.problem.trim() || "New request — see original message" };
}

export async function extract(raw: string, hint?: Source): Promise<ExtractResult> {
  const rules = extractWithRules(raw, hint);
  if (!process.env.ANTHROPIC_API_KEY) return { ...rules, method: "rules" };

  try {
    const ai = await extractWithClaude(raw, hint);
    // Belt and braces: a phone number the regex can see is never thrown away.
    return { ...ai, phone: ai.phone ?? rules.phone, email: ai.email ?? rules.email, method: "claude" };
  } catch (err) {
    console.warn("[extract] Claude extraction failed, using rules:", err instanceof Error ? err.message : err);
    return { ...rules, method: "rules" };
  }
}
