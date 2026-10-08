import type { Metadata } from "next";
import "@cmsjs/app/globals.css";
import { defaultMetadata } from "@cmsjs/app/meta";
import { SiteFooter } from "@cmsjs/components/layout/site-footer";
import { SiteHeader } from "@cmsjs/components/layout/site-header";
import { config } from "@cmsjs/config";

export const metadata: Metadata = {
  ...defaultMetadata,
  metadataBase: config.siteUrl,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
