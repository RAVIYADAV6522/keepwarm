import { pick, readBody, runIntake, summary, tokenOk } from "@/lib/inbound";
import { normalizePhone } from "@/lib/phone";
import { isSignedIn } from "@/lib/session";

// Door 1: the website contact form. Public, so it's protected by a honeypot instead of a token.
export async function POST(req: Request) {
  const body = await readBody(req);
  const isHtmlForm = !(req.headers.get("content-type") ?? "").includes("application/json");

  // Bots fill every field, including the hidden "website" one. Pretend it worked.
  if (pick(body, "website")) return done(req, isHtmlForm, { outcome: "ignored" });

  const message = pick(body, "message");
  const phone = pick(body, "phone");
  if (!message && !phone) return Response.json({ error: "Message or phone is required" }, { status: 400 });

  const raw = [
    "Website contact form",
    `Name: ${pick(body, "name")}`,
    `Business: ${pick(body, "business")}`,
    `Phone: ${phone}`,
    `Email: ${pick(body, "email")}`,
    `Address: ${pick(body, "address")}`,
    `Message: ${message}`,
  ].join("\n");

  // The form already separates the fields — trust them over extraction where they're filled in.
  const owner = isHtmlForm && (await isSignedIn());
  const result = await runIntake(raw, "web_form", {
    overrides: Object.fromEntries(
      Object.entries({
        customerName: pick(body, "name"),
        businessName: pick(body, "business"),
        phone: normalizePhone(phone) ? phone : "", // a garbled number shouldn't override one the extractor found
        email: pick(body, "email"),
        address: pick(body, "address"),
      }).filter(([, v]) => v),
    ),
  });
  // The public gets a plain "thanks". Only the in-app simulator (which carries the inbound token) sees
  // the details, so the form can't be used to check who is a customer.
  const internal = !!process.env.INBOUND_TOKEN && tokenOk(req);
  // Signed in (trying the demo form): go straight to Today, where the new request is waiting.
  if (owner) return Response.redirect(new URL("/?from=contact", req.url), 303);
  return done(req, isHtmlForm, internal ? summary(result) : { ok: true });
}

function done(req: Request, isHtmlForm: boolean, json: object) {
  if (isHtmlForm) return Response.redirect(new URL("/contact?sent=1", req.url), 303);
  return Response.json(json);
}
