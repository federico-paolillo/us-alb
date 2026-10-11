import { listLocations } from "@cmsjs/cms/data";
import type { AboutPageDto } from "@cmsjs/cms/model";
import { BoardSection } from "@cmsjs/components/about/board";
import { DocumentsIntro } from "@cmsjs/components/about/documents-intro";
import { FacilitiesSection } from "@cmsjs/components/about/facilities";
import { type AboutSectionLink, Hero } from "@cmsjs/components/about/hero";
import { HistorySection } from "@cmsjs/components/about/history";
import { TimelineSection } from "@cmsjs/components/about/timeline";
import { ValuesSection } from "@cmsjs/components/about/values";
import { io } from "next/cache";

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

export async function AboutPage({ page }: { page: AboutPageDto }) {
  await io();
  const locations = (await listLocations()).filter(
    (location) =>
      location.showOnAbout &&
      (hasText(location.name) ||
        hasText(location.aboutSummary ?? "") ||
        hasText(location.address) ||
        Boolean(location.aboutImage)),
  );
  const timeline = page.timeline.filter(
    (entry) =>
      hasText(entry.year) || hasText(entry.title) || hasText(entry.body),
  );
  const values = page.values.filter(
    (value) => hasText(value.title) || hasText(value.body),
  );
  const boardMembers = page.boardMembers.filter(
    (member) =>
      hasText(member.name) ||
      hasText(member.role) ||
      hasText(member.bio) ||
      Boolean(member.portrait),
  );
  const hasDocuments =
    hasText(page.documentTitle) || hasText(page.documentIntroduction);

  const sectionLinks: AboutSectionLink[] = [
    ...(page.history.length > 0
      ? [{ href: "#storia" as const, label: "Storia" }]
      : []),
    ...(timeline.length > 0
      ? [{ href: "#cronologia" as const, label: "Cronologia" }]
      : []),
    ...(values.length > 0
      ? [{ href: "#valori" as const, label: "Valori" }]
      : []),
    ...(boardMembers.length > 0
      ? [{ href: "#direttivo" as const, label: "Direttivo" }]
      : []),
    ...(locations.length > 0
      ? [{ href: "#impianti" as const, label: "Impianti" }]
      : []),
    ...(hasDocuments
      ? [{ href: "#documenti" as const, label: "Documenti" }]
      : []),
  ];

  return (
    <main>
      <Hero
        eyebrow={page.eyebrow}
        headline={page.headline}
        heroImage={page.heroImage}
        introduction={page.introduction}
        sectionLinks={sectionLinks}
      />
      <HistorySection history={page.history} />
      <TimelineSection entries={timeline} />
      <ValuesSection values={values} />
      <BoardSection members={boardMembers} />
      <FacilitiesSection locations={locations} />
      <DocumentsIntro
        eyebrow={page.documentEyebrow}
        introduction={page.documentIntroduction}
        title={page.documentTitle}
      />
    </main>
  );
}
