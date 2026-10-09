import { SITE_DESCRIPTION, SITE_NAME } from "@cmsjs/seo";
import type { Metadata } from "next";

export const defaultMetadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  publisher: "Unione Sportiva Albatese ASD",
  openGraph: {
    siteName: SITE_NAME,
    locale: "it_IT",
    type: "website",
  },
  robots: { index: true, follow: true },
  other: {
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "development",
  },
};
