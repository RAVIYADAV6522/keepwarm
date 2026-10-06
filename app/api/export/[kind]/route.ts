import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { config } from "@/lib/config";
import { toCsv } from "@/lib/csv";
import { EQUIPMENT_LABEL, SOURCE_LABEL, STAGE_LABEL, URGENCY_LABEL } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { getAllJobs } from "@/lib/queries";
import { isSignedIn } from "@/lib/session";
import { toDateInput } from "@/lib/time";

// "My data is mine": every job or customer as a CSV. Behind the passcode like the rest of the app.
export async function GET(_req: Request, { params }: RouteContext<"/api/export/[kind]">) {
  if (!(await isSignedIn())) return new Response("Unauthorized", { status: 401 });
  const { kind } = await params;
  const tz = config.BUSINESS_TZ;
  const day = (d: Date | null) => toDateInput(d, tz);
  let csv: string;

  if (kind === "jobs") {
    const jobs = await getAllJobs();
    csv = toCsv(
      ["Job ID", "Business", "Contact", "Phone", "Email", "Problem", "Equipment", "Urgency", "Source", "Stage", "Quote ($)", "Quote sent", "Visit", "Last contact", "Lost reason", "Created", "Closed"],
      jobs.map((j) => [
        j.id,
        j.customer.businessName,
        j.customer.name,
        formatPhone(j.customer.phone),
        j.customer.email,
        j.problem,
        EQUIPMENT_LABEL[j.equipment],
        URGENCY_LABEL[j.urgency],
        SOURCE_LABEL[j.source],
        STAGE_LABEL[j.stage],
        j.quoteAmount == null ? null : j.quoteAmount / 100,
        day(j.quoteSentAt),
        day(j.scheduledFor),
        day(j.lastContactAt),
        j.lostReason,
        day(j.createdAt),
        day(j.closedAt),
      ]),
    );
  } else if (kind === "customers") {
    const db = await getDb();
    const rows = await db.select().from(customers).orderBy(customers.id);
    csv = toCsv(
      ["Customer ID", "Business", "Contact", "Phone", "Email", "Address", "Added"],
      rows.map((c) => [c.id, c.businessName, c.name, formatPhone(c.phone), c.email, c.address, day(c.createdAt)]),
    );
  } else {
    return new Response("Not found", { status: 404 });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="keepwarm-${kind}-${day(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
