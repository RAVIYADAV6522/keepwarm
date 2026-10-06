import { z } from "zod";
import { getDb } from "@/db";
import { SOURCES } from "@/lib/constants";
import { extract } from "@/lib/extract";
import { matchCustomer } from "@/lib/match";

// Denise's "+" screen: turn pasted or dictated text into a preview she can fix before saving.
const Body = z.object({ raw: z.string().trim().min(1).max(10_000), source: z.enum(SOURCES).optional() });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Send { raw: string }" }, { status: 400 });

  const extracted = await extract(parsed.data.raw, parsed.data.source);
  const match = await matchCustomer(await getDb(), extracted.phone, extracted.email);
  return Response.json({ extracted, match });
}
