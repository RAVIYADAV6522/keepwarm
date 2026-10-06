import { SOURCES, type Source } from "@/lib/constants";
import { money, plural, SOURCE_LABEL } from "@/lib/format";
import type { getNumbers } from "@/lib/numbers";

const SOURCE_COLOR: Record<Source, string> = {
  call: "var(--src-call)",
  text: "var(--src-text)",
  email: "var(--src-email)",
  web_form: "var(--src-web)",
  notebook: "var(--src-notebook)",
};

function Tile({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-2xl px-4 py-3.5 ${highlight ? "bg-green-s" : "border border-line bg-surface"}`}>
      <span className={`text-sm ${highlight ? "font-medium text-green" : "text-ink2"}`}>{label}</span>
      <span className="font-serif text-[40px] leading-none tabular-nums">{value}</span>
      {sub && <span className="text-[13px] text-ink2">{sub}</span>}
    </div>
  );
}

// The Numbers screen body, shared by /numbers and the read-only /share link.
export function NumbersView({ n }: { n: ReturnType<typeof getNumbers> }) {
  const max = Math.max(1, ...n.bars.map((b) => b.total));
  const CHART_PX = 150;
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        <Tile label="Open jobs" value={n.open} sub={n.notContacted ? `${n.notContacted} not contacted yet` : "Everyone's been contacted"} />
        <Tile label="New in the last 7 days" value={n.newThisWeek} />
        <Tile label={`Waiting on a yes · ${plural(n.waitingCount, "job")}`} value={money(n.waitingCents) || "$0"} />
        <Tile label="Won this month" value={money(n.wonCents) || "$0"} sub={plural(n.wonCount, "job") + " done"} highlight />
        <Tile label="Lost this month" value={n.lostCount} sub={n.lostCents ? `${money(n.lostCents)} in quotes` : undefined} />
      </div>

      <figure className="card flex flex-col gap-3.5 p-4">
        <figcaption className="text-[15px] font-semibold">New jobs per week, by where they came from</figcaption>
        <div className="grid grid-cols-6 items-end gap-3" style={{ height: CHART_PX + 40 }}>
          {n.bars.map((b) => {
            const segs = SOURCES.filter((s) => b.bySource[s] > 0);
            return (
              <div key={b.label} className="group relative flex h-full flex-col items-stretch justify-end gap-1.5">
                <span className="text-center text-xs font-semibold tabular-nums">{b.total}</span>
                <div className="mx-auto flex w-full max-w-14 flex-col-reverse gap-0.5 overflow-hidden rounded-t" style={{ height: (b.total / max) * CHART_PX }}>
                  {segs.map((s) => (
                    <div key={s} title={`${SOURCE_LABEL[s]}: ${b.bySource[s]}`} style={{ flexGrow: b.bySource[s], background: SOURCE_COLOR[s] }} />
                  ))}
                </div>
                <span className="text-center text-[11.5px] whitespace-nowrap text-ink2">{b.label}</span>
                {b.total > 0 && (
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden w-36 -translate-x-1/2 rounded-xl border border-line bg-surface p-2.5 text-xs shadow-lg group-hover:block">
                    <div className="mb-1 font-semibold">Week of {b.label === "This wk" ? "this week" : b.label}</div>
                    {segs.map((s) => (
                      <div key={s} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-ink2">
                          <span className="h-2 w-2 rounded-sm" style={{ background: SOURCE_COLOR[s] }} />
                          {SOURCE_LABEL[s]}
                        </span>
                        <span className="tabular-nums">{b.bySource[s]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
          {SOURCES.map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-[13px] text-ink2">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: SOURCE_COLOR[s] }} />
              {SOURCE_LABEL[s]}
            </div>
          ))}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-ink2">Show as a table</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left tabular-nums">
              <thead className="text-ink2">
                <tr>
                  <th className="py-1 pr-3 font-medium">Week</th>
                  {SOURCES.map((s) => (
                    <th key={s} className="py-1 pr-3 font-medium">{SOURCE_LABEL[s]}</th>
                  ))}
                  <th className="py-1 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {n.bars.map((b) => (
                  <tr key={b.label} className="border-t border-line">
                    <td className="py-1 pr-3">{b.label}</td>
                    {SOURCES.map((s) => (
                      <td key={s} className="py-1 pr-3">{b.bySource[s]}</td>
                    ))}
                    <td className="py-1 font-semibold">{b.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </figure>

      {n.lostReasons.length > 0 && (
        <div className="card flex flex-col gap-2.5 p-4">
          <div className="text-[15px] font-semibold">Why jobs were lost this month</div>
          <ul className="flex flex-col gap-1.5">
            {n.lostReasons.map((r) => (
              <li key={r.reason} className="flex items-center justify-between gap-3 text-[15px]">
                <span className="text-ink2">{r.reason}</span>
                <span className="font-semibold tabular-nums">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
