import { getHomePage } from "@cmsjs/cms/data";
import { PageSwitch } from "@cmsjs/components/page-switch";
import { createPageMetadata, HOME_TITLE, SITE_DESCRIPTION } from "@cmsjs/seo";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  await io();
  const page = await getHomePage();

  return createPageMetadata({
    path: "/",
    title: HOME_TITLE,
    openGraphTitle: HOME_TITLE,
    description: SITE_DESCRIPTION,
    image: page?.heroImage,
    type: "website",
    absoluteTitle: true,
  });
}

export default async function HomePage() {
  await io();

  const page = await getHomePage();

  if (!page) {
    notFound();
  }

  return <PageSwitch page={page} />;
}
