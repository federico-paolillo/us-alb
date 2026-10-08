import type { CalendarEntryDto } from "@cmsjs/cms/model";
import Link from "next/link";

const fixtureDateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export function NextFixture({ entry }: { entry?: CalendarEntryDto }) {
  if (!entry) return null;

  const hasBothTeams = Boolean(entry.homeTeam && entry.awayTeam);

  return (
    <section
      aria-labelledby="prossimo-incontro-heading"
      className="scroll-mt-28 bg-surface-canvas py-14 md:py-24"
      id="prossimo-incontro"
    >
      <div className="site-container">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
              {entry.competition}
            </p>
            <h2
              className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
              id="prossimo-incontro-heading"
            >
              Prossimo incontro
            </h2>
          </div>
          <time
            className="text-sm font-semibold text-ink-muted capitalize"
            dateTime={entry.startsAt}
          >
            {fixtureDateFormatter.format(new Date(entry.startsAt))}
          </time>
        </div>

        <article className="mt-8 rounded-editorial-lg border border-outline-soft/60 bg-surface-lowest p-6 shadow-card md:mt-10 md:p-10">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="lg:col-span-8">
              {hasBothTeams ? (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
                  <div className="min-w-0 text-center sm:text-left">
                    <p className="text-[0.625rem] font-bold tracking-editorial text-ink-muted uppercase">
                      Casa
                    </p>
                    <h3 className="mt-2 font-display text-lg leading-6 font-semibold text-ink sm:text-2xl sm:leading-8">
                      {entry.homeTeam}
                    </h3>
                  </div>
                  <div
                    aria-hidden="true"
                    className="flex items-center gap-2 text-sm font-semibold text-outline"
                  >
                    <span className="hidden h-px w-6 bg-outline-soft sm:block" />
                    vs
                    <span className="hidden h-px w-6 bg-outline-soft sm:block" />
                  </div>
                  <div className="min-w-0 text-center sm:text-right">
                    <p className="text-[0.625rem] font-bold tracking-editorial text-ink-muted uppercase">
                      Ospiti
                    </p>
                    <h3 className="mt-2 font-display text-lg leading-6 font-semibold text-ink sm:text-2xl sm:leading-8">
                      {entry.awayTeam}
                    </h3>
                  </div>
                </div>
              ) : (
                <h3 className="font-display text-2xl leading-8 font-semibold text-ink md:text-3xl md:leading-10">
                  {entry.title}
                </h3>
              )}
            </div>

            <div className="border-t border-outline-soft/60 pt-6 lg:col-span-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              <p className="text-sm leading-6 font-semibold text-ink">
                {entry.venue}
              </p>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                {entry.summary}
              </p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center gap-2 py-2 text-xs font-bold tracking-editorial text-gold-deep uppercase underline decoration-gold-display/50 underline-offset-4 hover:text-ink"
                href="/notizie"
              >
                Calendario completo
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
