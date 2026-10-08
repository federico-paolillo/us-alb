import type { CmsPageDto } from "@cmsjs/cms/model";
import { AboutPage } from "@cmsjs/components/about/page";
import { ActivityPage } from "@cmsjs/components/activity/page";
import { HomePage } from "@cmsjs/components/home/page";
import { NewsDetailPage } from "@cmsjs/components/news-detail/page";
import { notFound } from "next/navigation";

export function PageSwitch({ page }: { page: CmsPageDto }) {
  switch (page.pageType) {
    case "home":
      return <HomePage page={page} />;
    case "about":
      return <AboutPage page={page} />;
    case "activity":
      return <ActivityPage page={page} />;
    case "news-detail":
      return <NewsDetailPage page={page} />;
    default:
      notFound();
  }
}
