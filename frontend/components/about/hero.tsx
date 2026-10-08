import type { ImageDto } from "@cmsjs/cms/model";
import { AboutMedia } from "@cmsjs/components/about/about-media";

type AboutSectionTarget =
  | "#storia"
  | "#cronologia"
  | "#valori"
  | "#direttivo"
  | "#impianti"
  | "#documenti";

export interface AboutSectionLink {
  href: AboutSectionTarget;
  label: string;
}

export function Hero({
  eyebrow,
  headline,
  heroImage,
  introduction,
  sectionLinks,
}: {
  eyebrow: string;
  headline: string;
  heroImage: ImageDto;
  introduction: string;
  sectionLinks: readonly AboutSectionLink[];
}) {
  const heading = headline.trim() || "Chi siamo";

  return (
    <section
      aria-labelledby="chi-siamo-heading"
      className="bg-surface-lowest py-12 md:py-20 lg:py-24"
    >
      <div className="site-container">
        <div className="grid items-end gap-9 md:grid-cols-12 md:gap-12 lg:gap-16">
          <div className="md:col-span-8">
            {eyebrow.trim() && (
              <p className="flex items-center gap-3 text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
                <span
                  aria-hidden="true"
                  className="h-0.5 w-6 bg-gold-display"
                />
                {eyebrow}
              </p>
            )}
            <h1
              className="mt-5 max-w-4xl font-display text-[2.25rem] leading-[2.75rem] font-bold tracking-[-0.02em] text-ink md:mt-6 md:text-display md:leading-[4rem] md:tracking-display"
              id="chi-siamo-heading"
            >
              {heading}
            </h1>
            {introduction.trim() && (
              <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-7 text-ink-muted md:mt-7 md:text-body-lg">
                {introduction}
              </p>
            )}
          </div>

          {sectionLinks.length > 0 && (
            <nav
              aria-label="In questa pagina"
              className="rounded-editorial-xl border border-outline-soft/50 bg-surface-low p-5 shadow-card md:col-span-4 md:p-7"
            >
              <p className="text-[0.625rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
                In questa pagina
              </p>
              <ul className="mt-4 flex flex-wrap gap-2 md:flex-col md:items-start md:gap-1">
                {sectionLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      className="inline-flex min-h-10 items-center gap-2 rounded-editorial-sm px-2 py-2 text-xs font-bold tracking-editorial text-ink-muted uppercase transition-colors hover:bg-surface-lowest hover:text-ink"
                      href={link.href}
                    >
                      <span aria-hidden="true" className="text-gold-deep">
                        →
                      </span>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        <figure className="relative mt-10 aspect-[5/3] max-h-[460px] overflow-hidden rounded-editorial-xl border border-outline-soft/50 bg-surface-container shadow-card md:mt-16 md:aspect-[5/2]">
          <AboutMedia
            image={heroImage}
            preload
            sizes="(min-width: 1280px) 1200px, (min-width: 768px) calc(100vw - 64px), calc(100vw - 40px)"
          />
        </figure>
      </div>
    </section>
  );
}
