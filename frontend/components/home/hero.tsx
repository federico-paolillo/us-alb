import type { HomePageDto } from "@cmsjs/cms/model";
import { HomeMedia } from "@cmsjs/components/home/home-media";
import Link from "next/link";

export function Hero({
  fixtureHref,
  page,
}: {
  fixtureHref: "#prossimo-incontro" | "/notizie";
  page: HomePageDto;
}) {
  return (
    <section
      aria-labelledby="home-heading"
      className="bg-surface-lowest py-12 md:py-20 lg:py-24"
    >
      <div className="site-container grid items-center gap-10 md:grid-cols-12 md:gap-12 lg:gap-16">
        <div className="md:col-span-7 md:pr-4 lg:pr-8">
          <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
            {page.eyebrow}
          </p>
          <h1
            className="mt-4 max-w-3xl font-display text-[2.25rem] leading-[2.75rem] font-bold tracking-[-0.02em] text-ink md:mt-6 md:text-display md:leading-[4rem] md:tracking-display"
            id="home-heading"
          >
            {page.headline}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ink-muted md:mt-7 md:text-body-lg">
            {page.introduction}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-4 md:mt-10">
            <Link
              className="inline-flex min-h-11 items-center gap-2 rounded-editorial-md bg-inverse px-5 py-3 text-xs font-bold tracking-editorial text-inverse-text uppercase shadow-card transition-colors hover:bg-ink"
              href={fixtureHref}
            >
              Prossimi impegni
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              className="inline-flex min-h-11 items-center border-b border-outline-soft px-1 py-3 text-xs font-bold tracking-editorial text-ink-muted uppercase transition-colors hover:border-gold-display hover:text-ink"
              href="/chi-siamo"
            >
              La nostra storia
            </Link>
          </div>
        </div>

        <figure className="relative aspect-[16/10] overflow-hidden rounded-editorial-lg border border-outline-soft/60 bg-surface-container shadow-card md:col-span-5 md:aspect-[4/5]">
          <HomeMedia
            image={page.heroImage}
            preload
            sizes="(min-width: 1280px) 440px, (min-width: 768px) 37vw, calc(100vw - 40px)"
          />
        </figure>
      </div>
    </section>
  );
}
