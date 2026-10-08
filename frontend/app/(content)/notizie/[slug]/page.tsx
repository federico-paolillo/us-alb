import { getNewsBySlug } from "@cmsjs/cms/data";
import { PageSwitch } from "@cmsjs/components/page-switch";
import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: PageProps<"/notizie/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getNewsBySlug(slug);
  if (!page) notFound();
  return { title: page.identity.title, description: page.summary };
}
export default async function NewsRoute({
  params,
}: PageProps<"/notizie/[slug]">) {
  await io();
  const { slug } = await params;
  const page = await getNewsBySlug(slug);
  if (!page) notFound();
  return <PageSwitch page={page} />;
}
