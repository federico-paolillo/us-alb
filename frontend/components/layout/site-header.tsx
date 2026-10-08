import { ClubBrand } from "@cmsjs/components/layout/club-brand";
import {
  DesktopSiteNav,
  DesktopSiteNavFallback,
} from "@cmsjs/components/layout/site-nav";
import Link from "next/link";
import { Suspense } from "react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-outline-soft/60 bg-surface-lowest/90 backdrop-blur-md md:h-24">
      <div className="site-container flex h-full items-center justify-between gap-4">
        <Link
          aria-label="U.S. Albatese, torna alla Home"
          className="min-w-0 shrink-0 transition-opacity hover:opacity-80"
          href="/"
        >
          <span className="md:hidden">
            <ClubBrand arrangement="compact" />
          </span>
          <span className="hidden md:inline-flex">
            <ClubBrand />
          </span>
        </Link>
        <div className="hidden min-w-0 items-center gap-4 md:flex lg:gap-8">
          <Suspense fallback={<DesktopSiteNavFallback />}>
            <DesktopSiteNav />
          </Suspense>
          <p className="flex shrink-0 items-center gap-2 font-body text-[0.625rem] font-bold tracking-editorial text-ink-muted uppercase">
            CSI • FIDAL
            <span className="h-1.5 w-1.5 rounded-full bg-gold-display" />
          </p>
        </div>
      </div>
    </header>
  );
}
