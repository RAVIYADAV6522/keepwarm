import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerNote } from "@/components/CustomerNote";
import { config } from "@/lib/config";
import { EQUIPMENT_LABEL, money, STAGE_LABEL } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { getCustomer } from "@/lib/queries";
import { formatDate } from "@/lib/time";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface px-4 py-3">
      <span className="text-[13px] text-ink2">{label}</span>
      <span className="font-serif text-[26px] leading-none tabular-nums">{value}</span>
    </div>
  );
}

export default async function CustomerPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  const data = Number.isInteger(Number(id)) ? await getCustomer(Number(id)) : null;
  if (!data) notFound();
  const { customer: c, jobs, summary: s } = data;
  const tz = config.BUSINESS_TZ;
  const open = jobs.filter((j) => j.stage !== "done" && j.stage !== "lost");
  const past = jobs.filter((j) => j.stage === "done" || j.stage === "lost");
  const first = c.name?.trim().split(/\s+/)[0];
  // Their first job can be older than the record (imported or seeded history).
  const since = jobs.reduce((d, j) => (j.createdAt < d ? j.createdAt : d), c.createdAt);

  const jobList = (title: string, list: typeof jobs) =>
    list.length > 0 && (
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-[22px]">{title}</h2>
        <div className="card divide-y divide-line">
          {list.map((j) => (
            <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted">
              <span className="flex min-w-0 flex-col">
                <span className="text-[15px] font-medium">{j.problem}</span>
                <span className="text-[13px] text-ink2">
                  {STAGE_LABEL[j.stage]} · {EQUIPMENT_LABEL[j.equipment]} · {formatDate(j.createdAt, tz)}
                  {j.lostReason ? ` · ${j.lostReason}` : ""}
                </span>
              </span>
              <span className="flex-none text-[15px] font-semibold tabular-nums">{money(j.quoteAmount)}</span>
            </Link>
          ))}
        </div>
      </section>
    );

  return (
    <div className="mx-auto flex max-w-[640px] flex-col gap-5">
      <Link href="/customers" className="-ml-1.5 flex h-11 w-fit items-center gap-1 text-base font-medium text-clay-ink">
        <span className="text-2xl leading-none">‹</span> Customers
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[clamp(30px,3.6vw,38px)] leading-[1.1]">{s.name}</h1>
        <div className="text-base text-ink2">{[s.contact, formatPhone(c.phone), c.email].filter(Boolean).join(" · ")}</div>
        {c.address && <div className="text-[15px] text-ink2">{c.address}</div>}
      </div>

      {c.phone && (
        <div className="flex gap-2">
          <a href={`tel:${c.phone}`} className="btn-primary h-[52px] flex-1 text-[17px]">
            Call {first ?? ""}
          </a>
          <a href={`sms:${c.phone}`} className="btn-secondary h-[52px] flex-1 text-[17px]">
            Text
          </a>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Stat label="Earned" value={money(s.revenueCents) || "$0"} />
        <Stat label="Jobs" value={String(s.jobs)} />
        <Stat label="Won" value={s.winRate == null ? "—" : `${Math.round(s.winRate * 100)}%`} />
        <Stat label="Customer since" value={since.toLocaleDateString("en-US", { timeZone: tz, month: "short", year: "numeric" })} />
      </div>

      <CustomerNote key={c.notes ?? ""} customerId={c.id} initial={c.notes ?? ""} />

      {jobList("Open jobs", open)}
      {jobList("Past jobs", past)}
    </div>
  );
}
