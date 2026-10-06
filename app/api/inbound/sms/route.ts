import { pick, readBody, runIntake, summary, tokenOk, unauthorized } from "@/lib/inbound";

// Door 3: texts. Shaped for a Twilio messaging webhook (From, Body) but also takes JSON { from, body }.
export async function POST(req: Request) {
  if (!tokenOk(req)) return unauthorized();
  const body = await readBody(req);
  const from = pick(body, "From", "from");
  const text = pick(body, "Body", "body", "text");
  if (!text) return Response.json({ error: "Message body is required" }, { status: 400 });

  // The sender's number is the most reliable thing we have — never let extraction override it.
  const result = await runIntake(`Text from ${from}:\n${text}`, "text", { overrides: from ? { phone: from } : {} });
  if (body.MessageSid) {
    // Twilio expects TwiML. Empty response = no auto-reply (Denise replies herself).
    return new Response("<Response></Response>", { headers: { "content-type": "text/xml" } });
  }
  return Response.json(summary(result));
}
