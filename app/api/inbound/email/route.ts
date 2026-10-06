import { pick, readBody, runIntake, summary, tokenOk, unauthorized } from "@/lib/inbound";

// Door 2: email. Point an inbound-email service (or a Gmail forwarding rule via Zapier/Make)
// at /api/inbound/email?token=... with { from, subject, text }.
export async function POST(req: Request) {
  if (!tokenOk(req)) return unauthorized();
  const body = await readBody(req);
  const text = pick(body, "text", "body", "plain", "TextBody", "stripped-text");
  if (!text) return Response.json({ error: "Email text is required" }, { status: 400 });

  const raw = [`From: ${pick(body, "from", "From", "sender")}`, `Subject: ${pick(body, "subject", "Subject")}`, "", text].join("\n");
  return Response.json(summary(await runIntake(raw, "email")));
}
