"use client";

import { LoadError } from "@/components/LoadError";
import "./globals.css";

// Last resort, if even the outer layout fails. It replaces the whole document, so it brings its own html/body.
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <title>KeepWarm</title>
        <LoadError retry={retry} home={false} />
      </body>
    </html>
  );
}
