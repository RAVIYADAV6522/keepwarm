import { EmailPreview } from "@/components/EmailPreview";
import { getDigest } from "@/lib/queries";

export default async function DigestPage() {
  const digest = await getDigest();
  const live = !!process.env.RESEND_API_KEY && !!process.env.ALERT_EMAIL_TO;
  return (
    <div className="flex max-w-[720px] flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-[clamp(30px,3.4vw,36px)]">Morning email</h1>
        <p className="text-[15px] text-ink2">
          Sent every morning at 7am (Denise&apos;s time) with the same list as Today.{" "}
          {live ? `Delivered to ${process.env.ALERT_EMAIL_TO}.` : "Email isn't configured yet, so it's printed to the server log instead."}
        </p>
      </div>
      <div className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3 text-sm">
          <span className="text-ink2">Subject:</span> <span className="font-medium">{digest.subject}</span>
        </div>
        <EmailPreview html={digest.html} />
      </div>
    </div>
  );
}
