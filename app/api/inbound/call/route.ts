import { formatPhone } from "@/lib/phone";
import { pick, readBody, runIntake, summary, tokenOk, unauthorized } from "@/lib/inbound";

// Door 4: missed calls. Shaped for a Twilio voicemail/transcription callback (From, TranscriptionText)
// and JSON { from, transcript }. A missed call with no voicemail still becomes a lead to call back.
export async function POST(req: Request) {
  if (!tokenOk(req)) return unauthorized();
  const body = await readBody(req);
  const from = pick(body, "From", "from", "Caller");
  if (!from) return Response.json({ error: "Caller number is required" }, { status: 400 });
  const transcript = pick(body, "TranscriptionText", "transcript", "voicemail");

  const raw = transcript ? `Missed call from ${formatPhone(from) || from}. Voicemail:\n${transcript}` : `Missed call from ${formatPhone(from) || from}. No voicemail.`;
  const result = await runIntake(raw, "call", {
    overrides: { phone: from, ...(transcript ? {} : { problem: "Missed call — no voicemail, call back" }) },
  });
  if (body.CallSid) return new Response("<Response></Response>", { headers: { "content-type": "text/xml" } });
  return Response.json(summary(result));
}
