import { SiteNav, SiteNavFallback } from "@cmsjs/components/layout/site-nav";
import Link from "next/link";
import { Suspense } from "react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3 sm:px-8">
        <Link
          className="font-mono text-sm font-semibold tracking-[0.08em] text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          href="/"
        >
          U.S. Albatese
        </Link>
        <Suspense fallback={<SiteNavFallback />}>
          <SiteNav />
        </Suspense>
      </div>
    </header>
  );
}
