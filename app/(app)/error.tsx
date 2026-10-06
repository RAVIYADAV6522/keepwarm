"use client";

import { LoadError } from "@/components/LoadError";

// A page inside the app failed to load: keep the menu, explain, offer a retry.
export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <LoadError retry={retry} />;
}
