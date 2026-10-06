"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || (href === "/jobs" && /^\/jobs\/\d+/.test(path)));

export function Sidebar({ todayCount, openCount, canLogout }: { todayCount: number; openCount: number; canLogout: boolean }) {
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
        <div className="mt-auto flex flex-col gap-1 px-3 text-[13px] text-ink2">
          <Link href="/digest" className="hover:text-ink">Morning email preview</Link>
          <Link href="/demo" className="hover:text-ink">Demo: simulate leads</Link>
          {canLogout && <LogoutButton />}
        </div>
      </div>
    </aside>
  );
}

export function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="hover:text-ink">
        Log out
      </button>
    </form>
  );
}

// Phones have no sidebar, so the extra links live at the bottom of each page.
export function MobileFooter({ canLogout }: { canLogout: boolean }) {
  return (
    <div className="mt-12 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-ink2 lg:hidden">
      <Link href="/digest" className="hover:text-ink">Morning email preview</Link>
      <Link href="/demo" className="hover:text-ink">Demo: simulate leads</Link>
      {canLogout && <LogoutButton />}
    </div>
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
