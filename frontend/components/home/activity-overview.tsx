import type { ActivityTeaserDto } from "@cmsjs/cms/model";
import { HomeMedia } from "@cmsjs/components/home/home-media";
import Link from "next/link";

export function ActivityOverview({
  teasers,
}: {
  teasers: readonly ActivityTeaserDto[];
}) {
  if (teasers.length === 0) return null;

  return (
    <section
      aria-labelledby="attivita-home-heading"
      className="bg-surface-low py-14 md:py-24"
      id="attivita-home"
    >
      <div className="site-container">
        <div className="max-w-2xl">
          <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
            Sport, educazione, comunità
          </p>
          <h2
            className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
            id="attivita-home-heading"
          >
            Le nostre attività
          </h2>
        </div>

        <div className="mt-9 grid gap-6 md:mt-12 md:grid-cols-2 lg:grid-cols-4">
          {teasers.map((teaser) => (
            <article
              className="flex flex-col overflow-hidden rounded-editorial-lg border border-outline-soft/60 bg-surface-lowest shadow-card"
              key={teaser.title}
            >
              {teaser.image && (
                <figure className="relative aspect-[16/10] overflow-hidden bg-surface-container">
                  <HomeMedia
                    image={teaser.image}
                    sizes="(min-width: 1280px) 264px, (min-width: 768px) 44vw, calc(100vw - 40px)"
                  />
                </figure>
              )}
              <div className="flex flex-1 flex-col p-5 md:p-6">
                {teaser.eyebrow && (
                  <p className="text-[0.625rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
                    {teaser.eyebrow}
                  </p>
                )}
                <h3 className="mt-2 font-display text-xl leading-7 font-semibold text-ink">
                  {teaser.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  {teaser.summary}
                </p>
              </div>
            </article>
          ))}
        </div>

        <Link
          className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-editorial-md border border-outline-soft bg-surface-lowest px-5 py-3 text-xs font-bold tracking-editorial text-ink uppercase transition-colors hover:border-gold-display hover:bg-gold-pale/40"
          href="/attivita"
        >
          Scopri tutte le attività
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
