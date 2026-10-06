"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || (href === "/jobs" && /^\/jobs\/\d+/.test(path)));

type Account = { owner: string; business: string; canLogout: boolean };

export function Sidebar({ todayCount, openCount, account }: { todayCount: number; openCount: number; account: Account }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Today", count: todayCount },
    { href: "/jobs", label: "All jobs", count: openCount },
    { href: "/numbers", label: "Numbers", count: null },
  ];
  return (
    // The aside stretches with the page so its background always reaches the bottom;
    // the inner column stays pinned while the content scrolls.
    <aside className="hidden w-[232px] flex-none border-r border-line bg-surface lg:block">
      <div className="sticky top-0 flex h-dvh flex-col gap-1.5 px-4 py-7">
        <Link href="/" className="px-3 pb-[22px] font-serif text-[26px]">
          KeepWarm
        </Link>
        {items.map((n) => {
          const on = isActive(path, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex h-11 items-center justify-between rounded-xl px-3.5 text-[15px] ${on ? "bg-clay font-semibold text-clay-ink" : "font-medium text-ink hover:bg-muted"}`}
            >
              {n.label}
              {n.count != null && <span className="text-[13px]">{n.count}</span>}
            </Link>
          );
        })}
        <Link href="/jobs/new" className="btn-primary mt-[18px] h-12 text-[15px]">
          <span className="text-[22px] leading-none font-light">+</span> New job
        </Link>
        <div className="mt-auto flex flex-col gap-1">
          <div className="px-3.5 pb-1 text-[11.5px] font-semibold tracking-[0.06em] text-ink2 uppercase">Tools</div>
          {TOOLS.map((t) => {
            const on = path === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex h-10 items-center gap-2.5 rounded-xl px-3.5 text-[14px] ${on ? "bg-clay font-semibold text-clay-ink" : "text-ink2 hover:bg-muted hover:text-ink"}`}
              >
                <t.Icon />
                {t.label}
              </Link>
            );
          })}
          <AccountRow account={account} />
        </div>
      </div>
    </aside>
  );
}

const TOOLS = [
  { href: "/digest", label: "Morning email", Icon: MailIcon },
  { href: "/demo", label: "Simulate leads", Icon: BoltIcon },
];

function AccountRow({ account }: { account: Account }) {
  return (
    <div className="mt-3 flex items-center gap-2.5 border-t border-line px-1.5 pt-4">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-clay font-serif text-[17px] text-clay-ink">
        {account.owner.charAt(0)}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[14px] font-semibold">{account.owner}</div>
        <div className="truncate text-[12px] text-ink2">{account.business}</div>
      </div>
      {account.canLogout && (
        <form action={logout}>
          <button
            type="submit"
            title="Log out"
            aria-label="Log out"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink2 hover:bg-muted hover:text-ink"
          >
            <LogoutIcon />
          </button>
        </form>
      )}
    </div>
  );
}

// Phones have no sidebar, so the tools and log out live in a small list at the bottom of each page.
export function MobileFooter({ account }: { account: Account }) {
  const row = "flex h-[52px] w-full items-center gap-3 px-4 text-[15px] text-ink";
  return (
    <div className="mt-12 flex flex-col gap-2.5 lg:hidden">
      <div className="px-1 text-[11.5px] font-semibold tracking-[0.06em] text-ink2 uppercase">Tools</div>
      <div className="card divide-y divide-line overflow-hidden">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className={row}>
            <span className="text-ink2"><t.Icon /></span>
            <span className="flex-1">{t.label}</span>
            <span className="text-ink2">›</span>
          </Link>
        ))}
        {account.canLogout && (
          <form action={logout}>
            <button type="submit" className={row}>
              <span className="text-ink2"><LogoutIcon /></span>
              <span className="flex-1 text-left">Log out</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function MailIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg {...iconProps}>
      <path d="M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg {...iconProps}>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 8 6 12l4 4" />
      <path d="M6 12h10" />
    </svg>
  );
}

export function BottomBar() {
  const path = usePathname();
  if (path === "/jobs/new") return null;
  const tab = (href: string, label: string) => {
    const on = isActive(path, href);
    return (
      <Link href={href} className="flex h-[52px] flex-col items-center justify-center gap-[5px]">
        <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-accent" : "bg-transparent"}`} />
        <span className={`text-[13px] font-semibold ${on ? "text-ink" : "text-ink2"}`}>{label}</span>
      </Link>
    );
  };
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid h-[84px] grid-cols-4 items-start border-t border-line bg-surface pt-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {tab("/", "Today")}
      {tab("/jobs", "All jobs")}
      <div className="flex justify-center">
        <Link
          href="/jobs/new"
          aria-label="New job"
          className="-mt-[22px] flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent text-[32px] leading-none font-light text-white shadow-[0_6px_18px_rgba(217,119,87,.4),0_0_0_5px_var(--bg)]"
        >
          +
        </Link>
      </div>
      {tab("/numbers", "Numbers")}
    </nav>
  );
}
