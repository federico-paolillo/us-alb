import { getAboutPage } from "@cmsjs/cms/data";
import { PageSwitch } from "@cmsjs/components/page-switch";
import { ABOUT_DESCRIPTION, createPageMetadata } from "@cmsjs/seo";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  await io();
  const page = await getAboutPage();

  return createPageMetadata({
    path: "/chi-siamo",
    title: "Chi siamo",
    openGraphTitle: "Chi siamo | U.S. Albatese",
    description: ABOUT_DESCRIPTION,
    image: page?.heroImage,
    type: "website",
  });
}

export default async function AboutRoute() {
  await io();
  const page = await getAboutPage();
  if (!page) notFound();
  return <PageSwitch page={page} />;
}
