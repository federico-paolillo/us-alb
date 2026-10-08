import type { Metadata } from "next";
import "@cmsjs/app/globals.css";
import { epilogue, manrope } from "@cmsjs/app/fonts";
import { defaultMetadata } from "@cmsjs/app/meta";
import { SiteFooter } from "@cmsjs/components/layout/site-footer";
import { SiteHeader } from "@cmsjs/components/layout/site-header";
import {
  MobileSiteNav,
  MobileSiteNavFallback,
} from "@cmsjs/components/layout/site-nav";
import { config } from "@cmsjs/config";
import { Suspense } from "react";

export const metadata: Metadata = {
  ...defaultMetadata,
  metadataBase: config.siteUrl,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={`${epilogue.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
      lang="it"
    >
      <body className="mobile-shell-clearance flex min-h-screen flex-col antialiased">
        <a
          className="fixed top-3 left-3 z-[100] -translate-y-24 rounded-editorial-md bg-inverse px-4 py-3 font-body text-sm font-semibold text-inverse-text shadow-overlay transition-transform focus:translate-y-0"
          href="#contenuto"
        >
          Vai al contenuto
        </a>
        <SiteHeader />
        <div className="flex-1 focus:outline-none" id="contenuto" tabIndex={-1}>
          {children}
        </div>
        <SiteFooter />
        <Suspense fallback={<MobileSiteNavFallback />}>
          <MobileSiteNav />
        </Suspense>
      </body>
    </html>
  );
}
