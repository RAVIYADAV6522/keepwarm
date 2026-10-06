import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { AddJob, type FromInbox } from "@/components/AddJob";
import type { ExtractResult } from "@/lib/extract";
import { getItem } from "@/lib/mailbox";
import { matchCustomer } from "@/lib/match";
import { formatPhone } from "@/lib/phone";

// "+" screen. With ?inbox=ID it opens straight on the preview, filled in from that email.
export default async function NewJobPage({ searchParams }: PageProps<"/jobs/new">) {
  const { inbox } = await searchParams;
  if (!inbox) return <AddJob />;

  const db = await getDb();
  const item = Number.isInteger(Number(inbox)) ? await getItem(db, Number(inbox)) : null;
  if (!item || item.status !== "pending" || !item.extracted) notFound();
  const x = item.extracted as ExtractResult;
  const fromInbox: FromInbox = {
    inboxId: item.id,
    raw: item.body ?? "",
    from: item.fromName ? `${item.fromName} (${item.fromEmail})` : (item.fromEmail ?? "email"),
    method: x.method ?? null,
    match: await matchCustomer(db, x.phone, x.email),
    fields: {
      businessName: x.business_name ?? "",
      customerName: x.customer_name ?? "",
      phone: formatPhone(x.phone) || "",
      email: x.email ?? "",
      address: x.address ?? "",
      problem: x.problem ?? "",
      equipment: x.equipment,
      urgency: x.urgency,
      source: "email",
    },
  };
  return <AddJob fromInbox={fromInbox} />;
}
