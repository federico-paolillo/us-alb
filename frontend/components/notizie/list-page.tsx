import type {
  CalendarEntryDto,
  NewsListItemDto,
  OfficialDocumentDto,
} from "@cmsjs/cms/model";
import { CalendarSection } from "@cmsjs/components/notizie/calendar-section";
import { DocumentsSection } from "@cmsjs/components/notizie/documents-section";
import { NotizieHero } from "@cmsjs/components/notizie/hero";
import { NewsSection } from "@cmsjs/components/notizie/news-section";
import {
  groupCalendarEntries,
  splitNewsLead,
} from "@cmsjs/components/notizie/presentation";

export function NotizieListPage({
  news,
  calendar,
  documents,
}: {
  news: NewsListItemDto[];
  calendar: CalendarEntryDto[];
  documents: OfficialDocumentDto[];
}) {
  const calendarGroups = groupCalendarEntries(calendar);
  const { lead, remaining } = splitNewsLead(news);

  return (
    <main>
      <NotizieHero />
      <CalendarSection groups={calendarGroups} />
      <NewsSection lead={lead} remaining={remaining} />
      <DocumentsSection documents={documents} />
    </main>
  );
}
