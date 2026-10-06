import { pick, readBody, runIntake, summary } from "@/lib/inbound";

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
  const result = await runIntake(raw, "web_form", {
    overrides: Object.fromEntries(
      Object.entries({
        customerName: pick(body, "name"),
        businessName: pick(body, "business"),
        phone,
        email: pick(body, "email"),
        address: pick(body, "address"),
      }).filter(([, v]) => v),
    ),
  });
  return done(req, isHtmlForm, summary(result));
}

function done(req: Request, isHtmlForm: boolean, json: object) {
  if (isHtmlForm) return Response.redirect(new URL("/contact?sent=1", req.url), 303);
  return Response.json(json);
}
