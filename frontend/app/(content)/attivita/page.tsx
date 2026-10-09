import { getActivityPage } from "@cmsjs/cms/data";
import { PageSwitch } from "@cmsjs/components/page-switch";
import { ACTIVITY_DESCRIPTION, createPageMetadata } from "@cmsjs/seo";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";

export async function generateMetadata(): Promise<Metadata> {
  await io();
  const page = await getActivityPage();

  return createPageMetadata({
    path: "/attivita",
    title: "Attività sportive",
    openGraphTitle: "Attività sportive | U.S. Albatese",
    description: ACTIVITY_DESCRIPTION,
    image: page?.heroImage,
    type: "website",
  });
}

export default async function ActivityRoute() {
  await io();
  const page = await getActivityPage();
  if (!page) notFound();
  return <PageSwitch page={page} />;
}
