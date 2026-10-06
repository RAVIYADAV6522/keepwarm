import type { Equipment, Source, Urgency } from "./constants";
import { normalizePhone } from "./phone";

// The free, offline extractor. Used when no ANTHROPIC_API_KEY is set, and as the fallback
// whenever the Claude call fails. It is deliberately simple: good enough that a lead is never
// lost, with Denise fixing anything it got wrong in the preview.

export type Extracted = {
  is_job_request: boolean;
  customer_name: string | null;
  business_name: string | null;
  phone: string | null; // E.164
  email: string | null;
  address: string | null;
  problem: string;
  equipment: Equipment;
  urgency: Urgency;
  confidence: "high" | "medium" | "low";
  notes: string | null;
};

const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

const EMERGENCY_RE =
  /\b(down|stopped|quit|died|dead|not (?:cooling|working|freezing|cold|getting cold)|won'?t (?:cool|freeze|turn on)|spoil\w*|thaw\w*|melt\w*|temp\w*.{0,20}(?:climbing|rising|going up)|emergency|asap|urgent\w*|right away|product (?:at risk|going bad)|losing (?:product|food|stock))\b/i;
const SOON_RE = /\b(warm\w*|nois\w*|loud|grinding|leak\w*|ic(?:ing|ed) up|frost\w*|this week|soon|not making ice|running (?:warm|hot)|tripping|buzzing)\b/i;
const SPAM_RE =
  /\b(unsubscribe|newsletter|invoice #?\d*|payment (?:received|due)|receipt|seo|rank (?:higher|on google)|google reviews? package|webinar|limited time|\d+% off|special offer|marketing services|backlinks?|crypto|wire transfer)\b/i;
const REPAIR_RE = /\b(cooler|freezer|walk[\s-]?in|reach[\s-]?in|ice (?:machine|maker)|compressor|gasket|refrigerat\w*|condenser|evaporator|thermostat|not cooling|repair|service visit|maintenance)\b/i;

type Label = "name" | "business" | "company" | "phone" | "email" | "address" | "message" | "details";

function labelled(raw: string): Partial<Record<Label, string>> {
  const out: Partial<Record<Label, string>> = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*(name|business(?: name)?|company|phone(?: number)?|email|address|message|details)\s*:\s*(.+)$/i.exec(line);
    if (m) {
      const key = m[1].toLowerCase().split(" ")[0] as Label;
      out[key] ??= m[2].trim();
    }
  }
  return out;
}

export function guessEquipment(text: string): Equipment {
  const t = text.toLowerCase();
  if (/ice (machine|maker)|\bice\b.*\b(not making|machine)/.test(t)) return "ice_machine";
  if (/walk[\s-]?in/.test(t)) return /freezer/.test(t) ? "walk_in_freezer" : "walk_in_cooler";
  if (/reach[\s-]?in|prep table|display case|under[\s-]?counter/.test(t)) return "reach_in";
  return "other";
}

export function guessUrgency(text: string): Urgency {
  text = text.replace(/\bnot (?:urgent|an emergency|asap)\b/gi, ""); // "not urgent yet" is not an emergency
  if (EMERGENCY_RE.test(text)) return "emergency";
  if (SOON_RE.test(text)) return "soon";
  return "routine";
}

function titleCase(s: string) {
  return s.replace(/(^|[\s-])([a-z])/g, (_, sep, c) => sep + c.toUpperCase()); // not after an apostrophe: "Tony's"
}

// "its marco from luigis" / "This is Tony at Tony's Diner" / "Sam (Corner Deli)"
function guessWho(text: string): { name: string | null; business: string | null; matched?: string } {
  const intro = /\b(?:this is|it'?s|its|i'?m|my name is)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:from|at|with)\s+(?:the\s+)?([a-z0-9'&.\s]{2,40}?)(?=[.,!\n]|\s+(?:our|the|we|my|and|walk|freezer|cooler|ice)\b|$)/i.exec(text);
  if (intro) return { name: titleCase(intro[1].trim()), business: titleCase(intro[2].trim()), matched: intro[0] };
  // "Tony (Tony's Diner)" — but not "Lakeshore Hotel (312) 555-…": the bracket must start with a letter.
  const paren = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*\(([A-Za-z][^)]{1,39})\)/.exec(text);
  if (paren) return { name: paren[1], business: paren[2].trim(), matched: paren[0] };
  const opener = /^\s*(?:hi,?\s+)?([a-z]+)\s+(?:from|at)\s+([a-z0-9'&.\s]{2,30}?)(?=[.,!\n]|\s+(?:our|the|we|my|and|walk|freezer|cooler|ice|got)\b)/i.exec(text.replace(/^(?:missed call from[^.]*\.\s*(?:voicemail:)?|text from[^:]*:)\s*/i, ""));
  if (opener && !/^(?:hi|hey|hello)$/i.test(opener[1])) return { name: titleCase(opener[1]), business: titleCase(opener[2].trim()), matched: opener[0] };
  const called = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+from\s+([A-Z][\w'&]*(?:\s[A-Z][\w'&]*)*)/.exec(text);
  if (called) return { name: called[1], business: called[2], matched: called[0] };
  // An email signature: "Dana Wells / Lakeshore Hotel / (312) 555-0266" on their own lines.
  const signature = /(?:^|\n)\s*([A-Z][a-z]+ [A-Z][a-z'-]+)\s*\n\s*([A-Z][\w'&.]*(?: (?:[A-Z&][\w'&.]*|of|and|the))*)\s*(?:\n|$)/.exec(text);
  if (signature && !/^(?:thanks|regards|best|cheers|sincerely)/i.test(signature[1])) return { name: signature[1], business: signature[2] };
  return { name: null, business: null };
}

const GREETING_RE = /^(?:(?:hi|hey|hello|good (?:morning|afternoon))\b[^.!?\n]*?[,.!\n]\s*|(?:this is|it'?s|its|i'?m)\b[^.!?\n]*?(?:from|at)\s+[^.!?\n]*?[.,!\n]\s*)+/i;

export function summarizeProblem(body: string): string {
  const cleaned = body
    .replace(new RegExp(PHONE_RE.source, "g"), "")
    .replace(new RegExp(EMAIL_RE.source, "g"), "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:missed call from[^.]*\.\s*(?:no voicemail\.?|voicemail:)?|text from[^:]*:)\s*/i, "")
    .replace(GREETING_RE, "")
    .replace(/^[\s,.;:!—-]+/, "")
    .trim();
  const first = (cleaned.split(/(?<=[.!?])\s/)[0] || cleaned).replace(/[.!?]+$/, "");
  const short = first.length > 90 ? first.slice(0, 87).replace(/\s+\S*$/, "") + "…" : first;
  return short ? short[0].toUpperCase() + short.slice(1) : "";
}

// Email header lines ("From:", "Subject:"...) say who wrote, not what's wrong — keep them out of the problem line.
const HEADER_RE = /^\s*(?:from|to|cc|reply-to|subject|date|sent)\s*:.*$/gim;

export function extractWithRules(raw: string, hint?: Source): Extracted {
  const text = raw.trim();
  const fields = labelled(text);
  const body = fields.message ?? fields.details ?? (text.replace(HEADER_RE, "").trim() || text);
  const who = guessWho(body);

  const phoneMatch = (fields.phone ?? text).match(PHONE_RE);
  const email = (fields.email ?? text).match(EMAIL_RE)?.[0] ?? null;
  const looksLikeSpam = SPAM_RE.test(text) && !REPAIR_RE.test(text);
  // Leave "Tony (Tony's Diner)" out of the problem line — it already has its own fields.
  const problem = summarizeProblem(who.matched ? body.replace(who.matched, "").replace(/^[\s,:—-]+/, "") : body);

  return {
    // Only email gets screened; a text or call from a customer is always worth a look.
    is_job_request: hint === "email" || hint === undefined ? !looksLikeSpam : true,
    customer_name: fields.name ?? who.name,
    business_name: fields.business ?? fields.company ?? who.business,
    phone: normalizePhone(phoneMatch?.[0]),
    email,
    address: fields.address ?? null,
    problem: problem || "New request — see original message",
    equipment: guessEquipment(body),
    urgency: guessUrgency(body),
    confidence: "low",
    notes: null,
  };
}
