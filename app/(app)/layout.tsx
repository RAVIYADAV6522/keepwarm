import { BottomBar, Sidebar } from "@/components/Nav";
import { getOpenJobs, getToday } from "@/lib/queries";

// The signed-in app: sidebar on desktop, bottom bar on phones.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [today, open] = await Promise.all([getToday(), getOpenJobs()]);
  return (
    <>
      <div className="flex min-h-dvh">
        {/* Same number as the Today header, so the badge and the page always agree. */}
        <Sidebar todayCount={today.calls} openCount={open.length} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1200px] px-5 pt-7 pb-32 lg:px-10 lg:pt-10 lg:pb-16">{children}</div>
        </main>
      </div>
      <BottomBar />
    </>
  );
}
