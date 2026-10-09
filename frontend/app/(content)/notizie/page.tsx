import {
  listCalendarEntries,
  listNews,
  listOfficialDocuments,
} from "@cmsjs/cms/data";
import { NotizieListPage } from "@cmsjs/components/notizie/list-page";
import { splitNewsLead } from "@cmsjs/components/notizie/presentation";
import { createPageMetadata, NEWS_DESCRIPTION } from "@cmsjs/seo";
import type { Metadata } from "next";
import { io } from "next/cache";

export async function generateMetadata(): Promise<Metadata> {
  await io();
  const news = await listNews();

  return createPageMetadata({
    path: "/notizie",
    title: "Notizie e calendario",
    openGraphTitle: "Notizie e calendario | U.S. Albatese",
    description: NEWS_DESCRIPTION,
    image: splitNewsLead(news).lead?.heroImage,
    type: "website",
  });
}

export default async function NewsIndexRoute() {
  await io();
  const [news, calendar, documents] = await Promise.all([
    listNews(),
    listCalendarEntries(),
    listOfficialDocuments(),
  ]);
  return (
    <NotizieListPage news={news} calendar={calendar} documents={documents} />
  );
}
