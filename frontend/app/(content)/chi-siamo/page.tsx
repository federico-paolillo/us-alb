import { getAboutPage } from "@cmsjs/cms/data";
import { PageSwitch } from "@cmsjs/components/page-switch";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Chi siamo" };

export default async function AboutRoute() {
  await io();
  const page = await getAboutPage();
  if (!page) notFound();
  return <PageSwitch page={page} />;
}
