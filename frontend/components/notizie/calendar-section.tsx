import type { CalendarEntryDto } from "@cmsjs/cms/model";
import { getResultScoreState } from "@cmsjs/components/notizie/presentation";
import { EmptyState } from "@cmsjs/components/shared/empty-state";

const calendarDateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

type CalendarGroups = Readonly<{
  matches: CalendarEntryDto[];
  results: CalendarEntryDto[];
  events: CalendarEntryDto[];
}>;

const groupDefinitions = [
  { key: "matches", label: "Prossime gare", fallbackTitle: "Partita" },
  { key: "results", label: "Risultati", fallbackTitle: "Risultato" },
  { key: "events", label: "Eventi", fallbackTitle: "Evento" },
] as const;

function hasText(value: string | undefined): value is string {
  return Boolean(value?.trim());
}

function CalendarCard({
  entry,
  fallbackTitle,
}: {
  entry: CalendarEntryDto;
  fallbackTitle: string;
}) {
  const hasTeams = hasText(entry.homeTeam) && hasText(entry.awayTeam);
  const score = getResultScoreState(entry);
  const callToAction = entry.callToAction;
  const hasCallToAction =
    callToAction && hasText(callToAction.label) && hasText(callToAction.url);

  return (
    <article className="flex h-full flex-col rounded-editorial-lg border border-outline-soft/60 bg-surface-lowest p-5 shadow-card md:p-6">
      <time
        className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase"
        dateTime={entry.startsAt}
      >
        {calendarDateFormatter.format(new Date(entry.startsAt))}
      </time>
      {hasText(entry.competition) && (
        <p className="mt-2 text-xs leading-5 font-semibold tracking-[0.04em] text-ink-muted uppercase">
          {entry.competition}
        </p>
      )}
      <h4 className="mt-4 font-display text-lg leading-7 font-semibold text-ink">
        {entry.title.trim() || fallbackTitle}
      </h4>

      {hasTeams && (
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-y border-outline-soft/50 py-4 text-center">
          <span className="text-sm leading-5 font-semibold text-ink">
            {entry.homeTeam}
          </span>
          {entry.kind === "result" && score.kind === "complete" ? (
            <span className="flex items-center gap-2 font-display text-2xl font-bold tabular-nums text-ink">
              <span>{score.home}</span>
              <span aria-hidden="true" className="text-sm text-ink-muted">
                –
              </span>
              <span>{score.away}</span>
            </span>
          ) : (
            <span className="text-[0.6875rem] font-bold tracking-editorial text-gold-deep uppercase">
              {entry.kind === "match" ? "VS" : "•"}
            </span>
          )}
          <span className="text-sm leading-5 font-semibold text-ink">
            {entry.awayTeam}
          </span>
        </div>
      )}

      {entry.kind === "result" && !hasTeams && score.kind === "complete" && (
        <p className="mt-5 font-display text-3xl font-bold tabular-nums text-ink">
          {score.home} <span aria-hidden="true">–</span> {score.away}
        </p>
      )}
      {entry.kind === "result" && score.kind === "unavailable" && (
        <p className="mt-5 rounded-editorial-sm bg-surface-low px-4 py-3 text-sm font-semibold text-ink-muted">
          Risultato non disponibile
        </p>
      )}
      {hasText(entry.venue) && (
        <p className="mt-4 text-sm leading-6 font-semibold text-ink-variant">
          {entry.venue}
        </p>
      )}
      {hasText(entry.summary) && (
        <p className="mt-2 text-sm leading-6 text-ink-muted">{entry.summary}</p>
      )}
      {hasCallToAction && (
        <a
          className="mt-auto inline-flex min-h-11 items-center gap-2 pt-5 text-xs font-bold tracking-editorial text-ink uppercase hover:text-gold-deep"
          href={callToAction.url}
        >
          {callToAction.label}
          <span aria-hidden="true">→</span>
        </a>
      )}
    </article>
  );
}

export function CalendarSection({ groups }: { groups: CalendarGroups }) {
  const nonemptyGroups = groupDefinitions.filter(
    ({ key }) => groups[key].length > 0,
  );

  return (
    <section
      aria-labelledby="calendario-heading"
      className="bg-surface-low py-14 md:py-24"
      id="calendario"
    >
      <div className="site-container">
        <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
          Match center
        </p>
        <h2
          className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
          id="calendario-heading"
        >
          Gare, risultati ed eventi
        </h2>

        {nonemptyGroups.length === 0 ? (
          <EmptyState
            body="Partite, risultati ed eventi compariranno qui quando il calendario sarà aggiornato."
            title="Nessun appuntamento pubblicato"
          />
        ) : (
          <div className="mt-9 grid gap-7 md:mt-12 lg:grid-cols-3 lg:gap-8">
            {nonemptyGroups.map(({ fallbackTitle, key, label }) => (
              <section aria-labelledby={`calendar-${key}`} key={key}>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-outline-soft"
                  />
                  <h3
                    className="font-display text-sm font-bold tracking-editorial text-ink uppercase"
                    id={`calendar-${key}`}
                  >
                    {label}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="h-px flex-1 bg-outline-soft"
                  />
                </div>
                <ul className="mt-5 space-y-4">
                  {groups[key].map((entry) => (
                    <li key={`${entry.startsAt}-${entry.title}`}>
                      <CalendarCard
                        entry={entry}
                        fallbackTitle={fallbackTitle}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
