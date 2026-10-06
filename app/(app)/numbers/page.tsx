import { headers } from "next/headers";
import { getDb } from "@/db";
import { NumbersView } from "@/components/NumbersView";
import { ShareCard } from "@/components/ShareCard";
import { config } from "@/lib/config";
import { getNumbers } from "@/lib/numbers";
import { getAllJobs } from "@/lib/queries";
import { getActiveShare } from "@/lib/share";

export default async function NumbersPage() {
  const now = new Date();
  const tz = config.BUSINESS_TZ;
  const [jobs, shareToken] = await Promise.all([getAllJobs(), getDb().then(getActiveShare)]);
  const h = await headers();
  const baseUrl = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const month = now.toLocaleDateString("en-US", { timeZone: tz, month: "long", year: "numeric" });

  return (
    <div className="flex max-w-[880px] flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h1 className="font-serif text-[clamp(30px,3.4vw,36px)]">Numbers</h1>
        <div className="text-sm text-ink2">{month}</div>
      </div>
      <NumbersView n={getNumbers(jobs, now, tz)} />
      <ShareCard token={shareToken} baseUrl={baseUrl} />
    </div>
  );
}
