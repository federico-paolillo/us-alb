import type { NewsDto } from "@cmsjs/cms/model";
import { ArticleBody } from "@cmsjs/components/news-detail/article-body";
import { NewsDetailHero } from "@cmsjs/components/news-detail/hero";

export function NewsDetailPage({ page }: { page: NewsDto }) {
  return (
    <main>
      <NewsDetailHero page={page} />
      <ArticleBody content={page.content} />
    </main>
  );
}
