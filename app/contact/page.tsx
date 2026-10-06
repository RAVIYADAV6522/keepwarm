import { BUSINESS_NAME } from "@/lib/config";

export const metadata = { title: `Contact · ${BUSINESS_NAME}` };

// Stand-in for the contact form on Denise's own website. A plain HTML form (no JavaScript needed)
// that posts to the same webhook her real site would.
export default async function ContactPage({ searchParams }: PageProps<"/contact">) {
  const { sent } = await searchParams;
  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col gap-6 px-5 py-10">
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold tracking-[0.06em] text-clay-ink uppercase">{BUSINESS_NAME}</div>
        <h1 className="font-serif text-[36px] leading-tight">Commercial refrigeration repair</h1>
        <p className="text-base text-ink2">Walk-in coolers, freezers, reach-ins and ice machines. Tell us what&apos;s going on and we&apos;ll call you back.</p>
      </div>

      {sent ? (
        <div className="card flex flex-col gap-2 p-6">
          <div className="font-serif text-2xl">Thanks — we got it.</div>
          <p className="text-ink2">We&apos;ll be in touch shortly. If your equipment is down, please also call us.</p>
          <a href="/contact" className="mt-2 text-sm font-semibold text-clay-ink underline underline-offset-2">Send another request</a>
        </div>
      ) : (
        <form action="/api/inbound/webform" method="post" className="card flex flex-col gap-4 p-5">
          {[
            { name: "name", label: "Your name", required: true },
            { name: "business", label: "Business name" },
            { name: "phone", label: "Phone", type: "tel", required: true },
            { name: "email", label: "Email", type: "email" },
            { name: "address", label: "Address" },
          ].map((f) => (
            <label key={f.name} className="flex flex-col gap-1.5">
              <span className="field-label">{f.label}</span>
              <input name={f.name} type={f.type ?? "text"} required={f.required} className="h-12 rounded-xl border border-line bg-bg px-3.5 text-base outline-none focus:border-accent" />
            </label>
          ))}
          <label className="flex flex-col gap-1.5">
            <span className="field-label">What&apos;s the problem?</span>
            <textarea name="message" required rows={4} className="resize-none rounded-xl border border-line bg-bg p-3.5 text-base outline-none focus:border-accent" />
          </label>
          {/* Honeypot: hidden from people, irresistible to bots. */}
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          <button type="submit" className="btn-primary h-14 text-[17px]">Send request</button>
        </form>
      )}
      <p className="text-center text-xs text-ink2">Demo form for the KeepWarm prototype — submissions appear in the app.</p>
    </div>
  );
}
