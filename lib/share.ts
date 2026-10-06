import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { shareLinks } from "@/db/schema";

// A secret, read-only link to the Numbers page that Denise can text to her husband.
// One link at a time; turning it off (or making a new one) kills the old URL.

export async function getActiveShare(db: Db): Promise<string | null> {
  const [row] = await db.select().from(shareLinks).where(isNull(shareLinks.revokedAt)).limit(1);
  return row?.token ?? null;
}

export async function createShare(db: Db, now = new Date()): Promise<string> {
  await revokeShare(db, now);
  const token = randomBytes(18).toString("base64url");
  await db.insert(shareLinks).values({ token, createdAt: now });
  return token;
}

export async function revokeShare(db: Db, now = new Date()) {
  await db.update(shareLinks).set({ revokedAt: now }).where(isNull(shareLinks.revokedAt));
}

export async function isValidShare(db: Db, token: string): Promise<boolean> {
  if (!/^[\w-]{20,40}$/.test(token)) return false;
  const [row] = await db
    .select({ id: shareLinks.id })
    .from(shareLinks)
    .where(and(eq(shareLinks.token, token), isNull(shareLinks.revokedAt)));
  return !!row;
}
