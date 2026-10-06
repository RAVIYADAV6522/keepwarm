import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import { BottomBar, Sidebar } from "@/components/Nav";
import { Toaster } from "@/components/toast";
import { getToday, getOpenJobs } from "@/lib/queries";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KeepWarm",
  description: "Keep every lead warm — who to call today, and where each job is at.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F5" },
    { media: "(prefers-color-scheme: dark)", color: "#1F1E1D" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [today, open] = await Promise.all([getToday(), getOpenJobs()]);
  return (
    <html lang="en" className={`${geist.variable} ${newsreader.variable} antialiased`}>
      <body className="font-sans">
        <div className="flex min-h-dvh">
          {/* Same number as the Today header, so the badge and the page always agree. */}
          <Sidebar todayCount={today.calls} openCount={open.length} />
          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-[1200px] px-5 pt-7 pb-32 lg:px-10 lg:pt-10 lg:pb-16">{children}</div>
          </main>
        </div>
        <BottomBar />
        <Toaster />
      </body>
    </html>
  );
}
