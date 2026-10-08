import type { NewsDto } from "@cmsjs/cms/model";
import { NewsDetailMedia } from "@cmsjs/components/news-detail/news-detail-media";
import Link from "next/link";

const editorialDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Rome",
});

export function NewsDetailHero({ page }: { page: NewsDto }) {
  const title = page.identity.title.trim() || "Notizia";

  return (
    <header className="border-b border-outline-soft/50 bg-surface-lowest py-10 md:py-16 lg:py-20">
      <div className="site-container">
        <div className="mx-auto max-w-4xl">
          <nav aria-label="Percorso della notizia">
            <Link
              className="inline-flex min-h-11 items-center gap-2 py-2 text-xs font-bold tracking-editorial text-ink-muted uppercase hover:text-ink"
              href="/notizie"
            >
              <span aria-hidden="true">←</span>
              Tutte le notizie
            </Link>
          </nav>

          <div className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] leading-4 font-bold tracking-editorial text-ink-muted uppercase">
            {page.featured && (
              <>
                <span className="text-gold-deep">In evidenza</span>
                <span aria-hidden="true">•</span>
              </>
            )}
            {page.category.trim() && (
              <>
                <span>{page.category}</span>
                <span aria-hidden="true">•</span>
              </>
            )}
            <time dateTime={page.editorialDate}>
              {editorialDateFormatter.format(
                new Date(`${page.editorialDate}T12:00:00Z`),
              )}
            </time>
          </div>
          <h1 className="mt-5 font-display text-[2.25rem] leading-[2.75rem] font-bold tracking-[-0.02em] text-ink md:text-display md:leading-[4rem] md:tracking-display">
            {title}
          </h1>
          {page.summary.trim() && (
            <p className="mt-6 max-w-3xl text-base leading-7 text-ink-muted md:text-body-lg md:leading-8">
              {page.summary}
            </p>
          )}
        </div>

        <figure className="relative mx-auto mt-10 aspect-[16/10] max-w-6xl overflow-hidden rounded-editorial-xl border border-outline-soft/50 bg-surface-container shadow-card md:mt-14">
          <NewsDetailMedia
            image={page.heroImage}
            preload
            sizes="(min-width: 1280px) 1104px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 40px)"
          />
        </figure>
      </div>
    </header>
  );
}
