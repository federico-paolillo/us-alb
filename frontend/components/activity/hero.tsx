import type { ImageDto, SportProgramGroup } from "@cmsjs/cms/model";
import { ActivityMedia } from "@cmsjs/components/activity/activity-media";

type ActivityGroupTarget =
  | "#programmi-youth-football"
  | "#programmi-competitive-football"
  | "#programmi-athletics"
  | "#programmi-community";

export interface ActivityGroupLink {
  group: SportProgramGroup;
  href: ActivityGroupTarget;
  label: string;
}

export function ActivityHero({
  eyebrow,
  groupLinks,
  headline,
  heroImage,
  introduction,
}: {
  eyebrow: string;
  groupLinks: readonly ActivityGroupLink[];
  headline: string;
  heroImage: ImageDto;
  introduction: string;
}) {
  const heading = headline.trim() || "Attività";

  return (
    <section
      aria-labelledby="attivita-heading"
      className="bg-surface-lowest py-12 md:py-20 lg:py-24"
    >
      <div className="site-container">
        <div className="grid items-center gap-9 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7 lg:pr-6">
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
              id="attivita-heading"
            >
              {heading}
            </h1>
            {introduction.trim() && (
              <p className="mt-5 max-w-3xl whitespace-pre-line text-base leading-7 text-ink-muted md:mt-7 md:text-body-lg">
                {introduction}
              </p>
            )}
          </div>

          <figure className="relative aspect-[16/10] overflow-hidden rounded-editorial-xl border border-outline-soft/50 bg-surface-container shadow-card lg:col-span-5">
            <ActivityMedia
              image={heroImage}
              preload
              sizes="(min-width: 1280px) 480px, (min-width: 1024px) 38vw, calc(100vw - 40px)"
            />
          </figure>
        </div>

        {groupLinks.length > 0 && (
          <nav aria-label="Categorie delle attività" className="mt-9 md:mt-12">
            <ul className="flex flex-wrap gap-2.5">
              <li>
                <a
                  className="inline-flex min-h-11 items-center rounded-editorial-md bg-inverse px-4 py-2.5 text-xs font-bold tracking-editorial text-inverse-text uppercase shadow-card transition-colors hover:bg-ink"
                  href="#programmi"
                >
                  Tutte le attività
                </a>
              </li>
              {groupLinks.map((link) => (
                <li key={link.href}>
                  <a
                    className="inline-flex min-h-11 items-center rounded-editorial-md border border-outline-soft/70 bg-surface-low px-4 py-2.5 text-xs font-bold tracking-editorial text-ink-variant uppercase transition-colors hover:border-gold-display hover:bg-gold-pale/50 hover:text-ink"
                    href={link.href}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
