import { getActivityPage } from "@cmsjs/cms/data";
import { PageSwitch } from "@cmsjs/components/page-switch";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Attività" };

export default async function ActivityRoute() {
  await io();
  const page = await getActivityPage();
  if (!page) notFound();
  return <PageSwitch page={page} />;
}
