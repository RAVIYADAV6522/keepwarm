import Link from "next/link";

// A missing job, customer or page: say so plainly and offer the way back.
export function NotFound({ what = "page" }: { what?: string }) {
  return (
    <div className="mx-auto flex max-w-[420px] flex-col items-center gap-3 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-clay font-serif text-[28px] text-clay-ink">?</div>
      <h1 className="font-serif text-[30px] leading-tight">We couldn&apos;t find that {what}</h1>
      <p className="text-[15px] leading-normal text-ink2">It may have been removed, or the link is mistyped.</p>
      <Link href="/" className="btn-primary mt-3 h-12 px-6 text-base">
        Back to Today
      </Link>
    </div>
  );
}
