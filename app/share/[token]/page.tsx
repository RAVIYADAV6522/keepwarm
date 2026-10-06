import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { NumbersView } from "@/components/NumbersView";
import { BUSINESS_NAME, config } from "@/lib/config";
import { getNumbers } from "@/lib/numbers";
import { getAllJobs } from "@/lib/queries";
import { isValidShare } from "@/lib/share";

export const metadata = { title: "Numbers · KeepWarm", robots: { index: false, follow: false } };

// Read-only Numbers for whoever Denise sent the link to. No passcode, no actions, no customer details.
export default async function SharedNumbersPage({ params }: PageProps<"/share/[token]">) {
  const { token } = await params;
  if (!(await isValidShare(await getDb(), token))) notFound();

  const now = new Date();
  const tz = config.BUSINESS_TZ;
  const month = now.toLocaleDateString("en-US", { timeZone: tz, month: "long", year: "numeric" });

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-5 py-8 lg:px-10 lg:py-12">
      <div className="flex flex-col gap-0.5">
        <div className="text-sm text-ink2">
          <span className="font-serif text-base text-ink">KeepWarm</span> · read-only
        </div>
        <h1 className="font-serif text-[clamp(30px,3.4vw,36px)]">{BUSINESS_NAME}</h1>
        <div className="text-sm text-ink2">Numbers for {month} · updated live</div>
      </div>
      <NumbersView n={getNumbers(await getAllJobs(), now, tz)} />
    </div>
  );
}
