import type { ScheduleDto, VenueDto } from "@cmsjs/cms/model";

export function SchedulesAndVenues({
  schedules,
  venues,
}: {
  schedules: readonly ScheduleDto[];
  venues: readonly VenueDto[];
}) {
  if (schedules.length === 0 && venues.length === 0) return null;

  const hasBoth = schedules.length > 0 && venues.length > 0;

  return (
    <section
      aria-labelledby="orari-heading"
      className="scroll-mt-28 bg-surface-canvas py-14 md:py-24"
      id="orari"
    >
      <div className="site-container">
        <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
          Allenamenti e spazi
        </p>
        <h2
          className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
          id="orari-heading"
        >
          Orari e luoghi
        </h2>

        <div className="mt-9 grid gap-10 md:mt-12 lg:grid-cols-12 lg:gap-10">
          {schedules.length > 0 && (
            <section
              aria-labelledby="allenamenti-heading"
              className={hasBoth ? "lg:col-span-8" : "lg:col-span-12"}
            >
              <h3
                className="font-display text-xl leading-7 font-semibold text-ink"
                id="allenamenti-heading"
              >
                Allenamenti settimanali
              </h3>
              <ul className="mt-5 grid gap-4 md:grid-cols-2">
                {schedules.map((schedule, index) => (
                  <li key={`${schedule.title}-${schedule.days}-${index}`}>
                    <article className="h-full rounded-editorial-lg border border-outline-soft/50 bg-surface-lowest p-5 shadow-card md:p-6">
                      {schedule.title.trim() && (
                        <h4 className="font-display text-lg leading-7 font-semibold text-ink">
                          {schedule.title}
                        </h4>
                      )}
                      <dl className="mt-4 space-y-3 border-t border-outline-soft/50 pt-4 text-sm leading-5">
                        {schedule.days.trim() && (
                          <div className="grid grid-cols-[4.5rem_1fr] gap-3">
                            <dt className="font-semibold text-ink-variant">
                              Giorni
                            </dt>
                            <dd className="text-ink-muted">{schedule.days}</dd>
                          </div>
                        )}
                        {schedule.time.trim() && (
                          <div className="grid grid-cols-[4.5rem_1fr] gap-3">
                            <dt className="font-semibold text-ink-variant">
                              Orario
                            </dt>
                            <dd className="text-ink-muted tabular-nums">
                              {schedule.time}
                            </dd>
                          </div>
                        )}
                        {schedule.venue.trim() && (
                          <div className="grid grid-cols-[4.5rem_1fr] gap-3">
                            <dt className="font-semibold text-ink-variant">
                              Sede
                            </dt>
                            <dd className="text-ink-muted">{schedule.venue}</dd>
                          </div>
                        )}
                      </dl>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {venues.length > 0 && (
            <section
              aria-labelledby="sedi-heading"
              className={hasBoth ? "lg:col-span-4" : "lg:col-span-12"}
            >
              <h3
                className="font-display text-xl leading-7 font-semibold text-ink"
                id="sedi-heading"
              >
                Le nostre sedi
              </h3>
              <ul
                className={`mt-5 grid gap-4 ${hasBoth ? "" : "md:grid-cols-2"}`}
              >
                {venues.map((venue, index) => (
                  <li key={`${venue.name}-${venue.address}-${index}`}>
                    <article className="h-full rounded-editorial-lg border border-outline-soft/50 bg-inverse p-5 text-inverse-text shadow-card md:p-6">
                      {venue.name.trim() && (
                        <h4 className="font-display text-lg leading-7 font-semibold">
                          {venue.name}
                        </h4>
                      )}
                      {venue.address.trim() && (
                        <address className="mt-3 text-sm leading-6 font-semibold text-gold-pale not-italic">
                          {venue.address}
                        </address>
                      )}
                      {venue.details.trim() && (
                        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-inverse-text/70">
                          {venue.details}
                        </p>
                      )}
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
