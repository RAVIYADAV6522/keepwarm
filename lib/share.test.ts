import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { testDb } from "@/test/db";
import { createShare, getActiveShare, isValidShare, revokeShare } from "./share";

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

describe("share links", () => {
  it("creates a long random token that opens the Numbers page", async () => {
    const token = await createShare(db);
    expect(token).toMatch(/^[\w-]{24}$/);
    expect(await getActiveShare(db)).toBe(token);
    expect(await isValidShare(db, token)).toBe(true);
  });

  it("a new link replaces the old one", async () => {
    const first = await createShare(db);
    const second = await createShare(db);
    expect(await isValidShare(db, first)).toBe(false);
    expect(await isValidShare(db, second)).toBe(true);
  });

  it("turning it off kills the link", async () => {
    const token = await createShare(db);
    await revokeShare(db);
    expect(await isValidShare(db, token)).toBe(false);
    expect(await getActiveShare(db)).toBeNull();
  });

  it("rejects made-up tokens", async () => {
    await createShare(db);
    expect(await isValidShare(db, "nope")).toBe(false);
    expect(await isValidShare(db, "x".repeat(24))).toBe(false);
  });
});
