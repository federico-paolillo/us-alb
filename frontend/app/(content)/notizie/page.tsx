import {
  listCalendarEntries,
  listNews,
  listOfficialDocuments,
} from "@cmsjs/cms/data";
import { NotizieListPage } from "@cmsjs/components/notizie/list-page";
import type { Metadata } from "next";
import { io } from "next/cache";

export const metadata: Metadata = { title: "Notizie" };

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
