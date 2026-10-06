import { CustomerList } from "@/components/CustomerList";
import { config } from "@/lib/config";
import { money } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { getCustomers } from "@/lib/queries";
import { relativeDay } from "@/lib/time";

export const metadata = { title: "Customers · KeepWarm" };

export default async function CustomersPage() {
  const now = new Date();
  const rows = (await getCustomers()).map((c) => ({
    id: c.id,
    name: c.name,
    contact: c.contact,
    phone: formatPhone(c.phone),
    revenue: money(c.revenueCents),
    jobs: c.jobs,
    open: c.open,
    last: c.lastJobAt ? `last job ${relativeDay(c.lastJobAt, now, config.BUSINESS_TZ)}` : "",
  }));
  return <CustomerList customers={rows} />;
}
