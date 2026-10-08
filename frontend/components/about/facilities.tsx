import type { FacilityDto } from "@cmsjs/cms/model";
import { AboutMedia } from "@cmsjs/components/about/about-media";

export function FacilitiesSection({
  facilities,
}: {
  facilities: readonly FacilityDto[];
}) {
  if (facilities.length === 0) return null;

  return (
    <section
      aria-labelledby="impianti-heading"
      className="scroll-mt-28 bg-surface-canvas py-14 md:py-24"
      id="impianti"
    >
      <div className="site-container">
        <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
          I luoghi dell’Albatese
        </p>
        <h2
          className="mt-2 max-w-2xl font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
          id="impianti-heading"
        >
          Campi, incontro e comunità
        </h2>

        <ul className="mt-9 grid gap-7 md:mt-12 md:grid-cols-2 md:gap-10">
          {facilities.map((facility) => (
            <li key={`${facility.name}-${facility.address}`}>
              <article className="flex h-full flex-col overflow-hidden rounded-editorial-xl border border-outline-soft/50 bg-surface-lowest shadow-card">
                {facility.image && (
                  <figure className="relative aspect-video overflow-hidden bg-surface-container">
                    <AboutMedia
                      image={facility.image}
                      sizes="(min-width: 1280px) 576px, (min-width: 768px) 46vw, calc(100vw - 40px)"
                    />
                  </figure>
                )}
                <div className="flex flex-1 flex-col p-6 md:p-8">
                  {facility.name.trim() && (
                    <h3 className="font-display text-xl leading-7 font-semibold text-ink md:text-headline-md">
                      {facility.name}
                    </h3>
                  )}
                  {facility.summary.trim() && (
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink-muted">
                      {facility.summary}
                    </p>
                  )}
                  {facility.address.trim() && (
                    <address className="mt-6 border-t border-outline-soft/60 pt-5 text-sm leading-6 font-semibold text-ink-variant not-italic">
                      {facility.address}
                    </address>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
