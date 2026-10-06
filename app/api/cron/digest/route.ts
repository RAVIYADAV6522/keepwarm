import { sendEmail } from "@/lib/notify";
import { getDigest } from "@/lib/queries";

// Called once a day by Vercel Cron (see vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const digest = await getDigest();
  const sent = await sendEmail(digest);
  return Response.json({ sent, subject: digest.subject });
}
