import { listCalendarEntries, listLocations, listNews } from "@cmsjs/cms/data";
import type { HomePageDto } from "@cmsjs/cms/model";
import { ActivityOverview } from "@cmsjs/components/home/activity-overview";
import { ContactSection } from "@cmsjs/components/home/contact-section";
import { FeaturedNews } from "@cmsjs/components/home/featured-news";
import { Hero } from "@cmsjs/components/home/hero";
import { InstitutionalQuote } from "@cmsjs/components/home/institutional-quote";
import { MetricsStrip } from "@cmsjs/components/home/metrics-strip";
import { NextFixture } from "@cmsjs/components/home/next-fixture";
import { PartnerStrip } from "@cmsjs/components/home/partner-strip";
import {
  selectFeaturedNews,
  selectNextFixture,
} from "@cmsjs/components/home/selection";
import { io } from "next/cache";

export async function HomePage({ page }: { page: HomePageDto }) {
  await io();
  const now = new Date();
  const [calendarEntries, news, locations] = await Promise.all([
    listCalendarEntries(),
    listNews(),
    listLocations(),
  ]);
  const fixture = selectNextFixture(calendarEntries, now);
  const featuredNews = selectFeaturedNews(news);
  const homeLocations = locations.filter((location) => location.showOnHome);

  return (
    <main>
      <Hero
        fixtureHref={fixture ? "#prossimo-incontro" : "/notizie"}
        page={page}
      />
      <MetricsStrip metrics={page.metrics} />
      <NextFixture entry={fixture} />
      <FeaturedNews news={featuredNews} />
      <ActivityOverview teasers={page.activityTeasers} />
      <InstitutionalQuote quote={page.institutionalQuote} />
      <PartnerStrip />
      <ContactSection
        contactMethods={page.contactMethods}
        heading={page.contactHeading}
        introduction={page.contactIntroduction}
        locations={homeLocations}
      />
    </main>
  );
}
