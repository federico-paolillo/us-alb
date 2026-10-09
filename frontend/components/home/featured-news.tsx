import type { NewsListItemDto } from "@cmsjs/cms/model";
import { HomeMedia } from "@cmsjs/components/home/home-media";
import { newsPath } from "@cmsjs/seo";
import Link from "next/link";

const editorialDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Rome",
});

export function FeaturedNews({ news }: { news: readonly NewsListItemDto[] }) {
  if (news.length === 0) return null;

  return (
    <section
      aria-labelledby="notizie-in-evidenza-heading"
      className="border-y border-outline-soft/50 bg-surface-lowest py-14 md:py-24"
      id="notizie-in-evidenza"
    >
      <div className="site-container">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
              Cronache e racconti
            </p>
            <h2
              className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
              id="notizie-in-evidenza-heading"
            >
              Notizie in evidenza
            </h2>
          </div>
          <Link
            className="hidden min-h-11 items-center gap-2 py-2 text-xs font-bold tracking-editorial text-ink-muted uppercase hover:text-ink sm:inline-flex"
            href="/notizie"
          >
            Archivio notizie
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="mt-9 grid gap-7 md:mt-12 md:grid-cols-3 md:gap-8 lg:gap-12">
          {news.map((item, index) => (
            <article
              className={index > 1 ? "hidden md:block" : undefined}
              key={item.identity.slug}
            >
              <Link
                className="group flex h-full flex-col overflow-hidden rounded-editorial-lg border border-outline-soft/50 bg-surface-lowest shadow-card transition-shadow hover:shadow-card-raised"
                href={newsPath(item.identity.slug)}
              >
                <figure className="relative aspect-[16/10] overflow-hidden bg-surface-container">
                  <HomeMedia
                    className="transition-transform duration-300 group-hover:scale-[1.02]"
                    image={item.heroImage}
                    sizes="(min-width: 1280px) 360px, (min-width: 768px) 30vw, calc(100vw - 40px)"
                  />
                </figure>
                <div className="flex flex-1 flex-col p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.625rem] leading-4 font-bold tracking-editorial text-ink-muted uppercase">
                    <span>{item.category}</span>
                    <span aria-hidden="true">•</span>
                    <time dateTime={item.editorialDate}>
                      {editorialDateFormatter.format(
                        new Date(`${item.editorialDate}T12:00:00Z`),
                      )}
                    </time>
                  </div>
                  <h3 className="mt-3 font-display text-lg leading-7 font-semibold text-ink transition-colors group-hover:text-gold-deep md:text-xl">
                    {item.identity.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-ink-muted">
                    {item.summary}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-2 pt-5 text-xs font-bold tracking-editorial text-ink uppercase">
                    Leggi l’articolo
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <Link
          className="mt-7 inline-flex min-h-11 items-center gap-2 py-2 text-xs font-bold tracking-editorial text-ink-muted uppercase hover:text-ink sm:hidden"
          href="/notizie"
        >
          Archivio notizie
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
