"use client";

import { LoadError } from "@/components/LoadError";

export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="px-5">
      <LoadError retry={retry} />
    </main>
  );
}
