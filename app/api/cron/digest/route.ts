import { getDb } from "@/db";
import { syncGmail } from "@/lib/mailbox";
import { sendEmail } from "@/lib/notify";
import { getDigest } from "@/lib/queries";

// Called once a day by Vercel Cron (see vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  // Without a secret the endpoint is only open in local development.
  const allowed = secret ? req.headers.get("authorization") === `Bearer ${secret}` : process.env.NODE_ENV !== "production";
  if (!allowed) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Pick up overnight email enquiries first, so emergencies make the morning list.
  await syncGmail(await getDb(), { force: true });
  const digest = await getDigest();
  const sent = await sendEmail(digest);
  return Response.json({ sent, subject: digest.subject });
}
