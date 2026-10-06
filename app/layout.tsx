import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import { OfflineBanner } from "@/components/OfflineBanner";
import { Toaster } from "@/components/toast";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KeepWarm",
  description: "Keep every lead warm — who to call today, and where each job is at.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F5F8" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0D16" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${newsreader.variable} antialiased`}>
      <body className="font-sans">
        {children}
        <Toaster />
        <OfflineBanner />
      </body>
    </html>
  );
}
