import { describe, expect, it } from "vitest";
import type { Customer } from "@/db/schema";
import { rankCustomers, summarizeCustomer } from "./customers";

const customer = (o: Partial<Customer> = {}): Customer => ({
  id: 1,
  name: "Tony Russo",
  businessName: "Tony's Diner",
  phone: "+13125550142",
  email: null,
  address: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  ...o,
});
const job = (stage: "new" | "done" | "lost", quoteAmount: number | null, day: string) => ({
  stage,
  quoteAmount,
  createdAt: new Date(day),
  equipment: "walk_in_freezer" as const,
});

describe("summarizeCustomer", () => {
  it("rolls up revenue from done jobs, win rate and the latest job", () => {
    const s = summarizeCustomer(customer(), [
      job("done", 34_000, "2026-09-01"),
      job("done", 51_000, "2026-05-01"),
      job("lost", 90_000, "2026-07-01"),
      job("new", null, "2026-10-05"),
    ]);
    expect(s).toMatchObject({ name: "Tony's Diner", contact: "Tony Russo", jobs: 4, open: 1, revenueCents: 85_000 });
    expect(s.winRate).toBeCloseTo(2 / 3);
    expect(s.lastJobAt).toEqual(new Date("2026-10-05"));
  });

  it("has no win rate until a job has closed", () => {
    expect(summarizeCustomer(customer(), [job("new", null, "2026-10-05")]).winRate).toBeNull();
  });
});

describe("rankCustomers", () => {
  it("puts the biggest customers first, then the most recent", () => {
    const a = summarizeCustomer(customer({ id: 1, businessName: "A" }), [job("done", 10_000, "2026-09-01")]);
    const b = summarizeCustomer(customer({ id: 2, businessName: "B" }), [job("done", 50_000, "2026-01-01")]);
    const c = summarizeCustomer(customer({ id: 3, businessName: "C" }), [job("new", null, "2026-10-01")]);
    const d = summarizeCustomer(customer({ id: 4, businessName: "D" }), [job("new", null, "2026-10-05")]);
    expect(rankCustomers([a, b, c, d]).map((x) => x.name)).toEqual(["B", "A", "D", "C"]);
  });
});
