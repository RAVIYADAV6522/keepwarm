"use client";

import Link from "next/link";
import { useState } from "react";

export type CustomerRow = { id: number; name: string; contact: string; phone: string; revenue: string; jobs: number; open: number; last: string };

const digits = (s: string) => s.replace(/\D/g, "");

export function CustomerList({ customers }: { customers: CustomerRow[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = customers.filter(
    (c) => !query || `${c.name} ${c.contact}`.toLowerCase().includes(query) || (digits(query).length >= 3 && digits(c.phone).includes(digits(query))),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-serif text-[clamp(30px,3.4vw,36px)]">Customers</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or phone"
          className="h-[46px] w-full rounded-xl border border-line bg-surface px-3.5 text-base outline-none focus:border-accent lg:w-[280px]"
        />
      </div>
      <p className="-mt-2 text-sm text-ink2">Biggest customers first, by money from finished jobs.</p>
      <div className="card divide-y divide-line">
        {shown.map((c) => (
          <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted">
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-semibold">{c.name}</span>
              <span className="truncate text-[13px] text-ink2">
                {[c.contact, `${c.jobs} ${c.jobs === 1 ? "job" : "jobs"}`, c.open ? `${c.open} open` : "", c.last].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="flex-none text-[15px] font-semibold tabular-nums">{c.revenue}</span>
          </Link>
        ))}
        {shown.length === 0 && <div className="px-4 py-6 text-center text-ink2">No customers match “{q}”.</div>}
      </div>
    </div>
  );
}
