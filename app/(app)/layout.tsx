import { BottomBar, MobileFooter, Sidebar } from "@/components/Nav";
import { getDb } from "@/db";
import { MailSync } from "@/components/InboxControls";
import { BUSINESS_NAME, OWNER_NAME } from "@/lib/config";
import { getAccount, pendingCount } from "@/lib/mailbox";
import { getOpenJobs, getToday } from "@/lib/queries";

// The signed-in app: sidebar on desktop, bottom bar on phones.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const db = await getDb();
  const [today, open, inbox, gmail] = await Promise.all([getToday(), getOpenJobs(), pendingCount(db), getAccount(db)]);
  const account = { owner: OWNER_NAME, business: BUSINESS_NAME, canLogout: Boolean(process.env.APP_PASSCODE) };
  return (
    <>
      <div className="flex min-h-dvh">
        {/* Same number as the Today header, so the badge and the page always agree. */}
        <Sidebar todayCount={today.calls} openCount={open.length} inboxCount={inbox} account={account} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1200px] px-5 pt-7 pb-32 lg:px-10 lg:pt-10 lg:pb-16">
            {children}
            <MobileFooter account={account} inboxCount={inbox} />
          </div>
        </main>
      </div>
      <BottomBar />
      {gmail && <MailSync />}
    </>
  );
}
