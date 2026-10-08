import type { NewsListItemDto } from "@cmsjs/cms/model";
import { NotizieMedia } from "@cmsjs/components/notizie/notizie-media";
import { EmptyState } from "@cmsjs/components/shared/empty-state";
import Link from "next/link";

const editorialDateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Rome",
});

function EditorialDate({ value }: { value: string }) {
  return (
    <time dateTime={value}>
      {editorialDateFormatter.format(new Date(`${value}T12:00:00Z`))}
    </time>
  );
}

export function NewsSection({
  lead,
  remaining,
}: {
  lead: NewsListItemDto | undefined;
  remaining: NewsListItemDto[];
}) {
  return (
    <section
      aria-labelledby="news-heading"
      className="border-y border-outline-soft/50 bg-surface-lowest py-14 md:py-24"
      id="notizie"
    >
      <div className="site-container">
        <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
          Dal club
        </p>
        <h2
          className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
          id="news-heading"
        >
          Articoli e approfondimenti
        </h2>

        {!lead ? (
          <EmptyState
            body="Le cronache della società saranno disponibili qui appena pubblicate."
            title="Nessuna notizia pubblicata"
          />
        ) : (
          <div className="mt-9 grid gap-8 md:mt-12 lg:grid-cols-12 lg:gap-12">
            <article className="lg:col-span-7">
              <Link
                className="group block overflow-hidden rounded-editorial-xl border border-outline-soft/50 bg-surface-lowest shadow-card transition-shadow hover:shadow-card-raised"
                href={`/notizie/${lead.identity.slug}`}
              >
                <figure className="relative aspect-[16/10] overflow-hidden bg-surface-container">
                  <NotizieMedia
                    className="transition-transform duration-300 group-hover:scale-[1.02]"
                    image={lead.heroImage}
                    preload
                    sizes="(min-width: 1280px) 680px, (min-width: 1024px) 56vw, calc(100vw - 40px)"
                  />
                </figure>
                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] leading-4 font-bold tracking-editorial text-ink-muted uppercase">
                    {lead.featured && (
                      <>
                        <span className="text-gold-deep">In evidenza</span>
                        <span aria-hidden="true">•</span>
                      </>
                    )}
                    <span>{lead.category}</span>
                    <span aria-hidden="true">•</span>
                    <EditorialDate value={lead.editorialDate} />
                  </div>
                  <h3 className="mt-4 font-display text-2xl leading-8 font-semibold text-ink transition-colors group-hover:text-gold-deep md:text-3xl md:leading-10">
                    {lead.identity.title}
                  </h3>
                  <p className="mt-4 text-base leading-7 text-ink-muted">
                    {lead.summary}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold tracking-editorial text-ink uppercase">
                    Leggi l’articolo
                    <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            </article>

            {remaining.length > 0 && (
              <div className="lg:col-span-5">
                <h3 className="font-display text-sm font-bold tracking-editorial text-ink uppercase">
                  Ultime notizie
                </h3>
                <ul className="mt-4 divide-y divide-outline-soft/60 border-y border-outline-soft/60">
                  {remaining.map((item) => (
                    <li key={item.identity.slug}>
                      <article>
                        <Link
                          className="group grid grid-cols-[7rem_minmax(0,1fr)] gap-4 py-5 sm:grid-cols-[10rem_1fr] lg:grid-cols-[8.5rem_1fr]"
                          href={`/notizie/${item.identity.slug}`}
                        >
                          <figure className="relative aspect-square overflow-hidden rounded-editorial-md bg-surface-container">
                            <NotizieMedia
                              className="transition-transform duration-300 group-hover:scale-[1.02]"
                              image={item.heroImage}
                              sizes="(min-width: 1024px) 136px, (min-width: 640px) 160px, 112px"
                            />
                          </figure>
                          <div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.625rem] leading-4 font-bold tracking-editorial text-ink-muted uppercase">
                              <span>{item.category}</span>
                              <span aria-hidden="true">•</span>
                              <EditorialDate value={item.editorialDate} />
                            </div>
                            <h4 className="mt-2 font-display text-lg leading-7 font-semibold text-ink transition-colors group-hover:text-gold-deep">
                              {item.identity.title}
                            </h4>
                            <p className="mt-2 text-sm leading-6 text-ink-muted">
                              {item.summary}
                            </p>
                          </div>
                        </Link>
                      </article>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
