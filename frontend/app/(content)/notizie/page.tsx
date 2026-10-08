import {
  listCalendarEntries,
  listNews,
  listOfficialDocuments,
} from "@cmsjs/cms/data";
import { NotizieListPage } from "@cmsjs/components/notizie/list-page";
import type { Metadata } from "next";
import { io } from "next/cache";

export const metadata: Metadata = {
  title: "Notizie e calendario",
  description:
    "Notizie, risultati, appuntamenti e documenti ufficiali dell’U.S. Albatese.",
};

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
