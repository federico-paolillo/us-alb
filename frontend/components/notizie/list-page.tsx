import type {
  CalendarEntryDto,
  NewsListItemDto,
  OfficialDocumentDto,
} from "@cmsjs/cms/model";
import { CmsImage } from "@cmsjs/components/shared/content";
import Link from "next/link";

const calendarGroups: ReadonlyArray<{
  kind: CalendarEntryDto["kind"];
  label: string;
}> = [
  { kind: "match", label: "Partite" },
  { kind: "result", label: "Risultati" },
  { kind: "event", label: "Eventi" },
];

export function NotizieListPage({
  news,
  calendar,
  documents,
}: {
  news: NewsListItemDto[];
  calendar: CalendarEntryDto[];
  documents: OfficialDocumentDto[];
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="text-4xl font-semibold text-text sm:text-6xl">Notizie</h1>
      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-text">Ultime notizie</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {news.map((item) => (
            <article
              className="rounded-card border border-border p-5"
              key={item.identity.slug}
            >
              <div className="mb-4">
                <CmsImage
                  image={item.heroImage}
                  sizes="(min-width: 768px) 544px, calc(100vw - 80px)"
                />
              </div>
              <p className="text-xs uppercase text-accent">
                {item.category} · {item.editorialDate}
                {item.featured ? " · In evidenza" : ""}
              </p>
              <h3 className="mt-2 text-xl font-semibold">
                <Link
                  className="text-text hover:text-accent"
                  href={`/notizie/${item.identity.slug}`}
                >
                  {item.identity.title}
                </Link>
              </h3>
              <p className="mt-3 text-muted">{item.summary}</p>
            </article>
          ))}
        </div>
        {news.length === 0 && (
          <p className="mt-5 text-muted">Nessuna notizia pubblicata.</p>
        )}
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-text">Calendario</h2>
        <div className="mt-5 space-y-8">
          {calendarGroups.map(({ kind, label }) => {
            const entries = calendar.filter((entry) => entry.kind === kind);
            if (entries.length === 0) return null;

            return (
              <section key={kind}>
                <h3 className="text-lg font-semibold text-text">{label}</h3>
                <div className="mt-4 space-y-4">
                  {entries.map((entry) => (
                    <article
                      className="border-l-2 border-accent pl-5"
                      key={`${entry.startsAt}-${entry.title}`}
                    >
                      <time
                        className="text-xs uppercase text-accent"
                        dateTime={entry.startsAt}
                      >
                        {entry.startsAt}
                      </time>
                      <h4 className="mt-1 font-semibold text-text">
                        {entry.title}
                      </h4>
                      <p className="mt-1 text-muted">
                        {entry.competition} · {entry.venue}
                      </p>
                      <p className="mt-2 text-muted">{entry.summary}</p>
                      {(entry.homeTeam || entry.awayTeam) && (
                        <p className="mt-2 font-medium text-text">
                          {entry.homeTeam ?? "—"}
                          {entry.homeScore === undefined
                            ? ""
                            : ` ${entry.homeScore}`}{" "}
                          ·{" "}
                          {entry.awayScore === undefined
                            ? ""
                            : `${entry.awayScore} `}
                          {entry.awayTeam ?? "—"}
                        </p>
                      )}
                      {entry.callToAction && (
                        <a
                          className="mt-3 inline-block text-accent underline underline-offset-4"
                          href={entry.callToAction.url}
                        >
                          {entry.callToAction.label}
                        </a>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
        {calendar.length === 0 && (
          <p className="mt-5 text-muted">Nessun appuntamento pubblicato.</p>
        )}
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-text">
          Documenti ufficiali
        </h2>
        <ul className="mt-5 space-y-3">
          {documents.map((document) => (
            <li key={`${document.displayOrder}-${document.title}`}>
              <a
                className="text-accent underline underline-offset-4"
                href={document.file.url}
              >
                {document.title}
              </a>
              <span className="ml-2 text-sm text-muted">
                {document.category} · {document.season}
              </span>
            </li>
          ))}
        </ul>
        {documents.length === 0 && (
          <p className="mt-5 text-muted">Nessun documento pubblicato.</p>
        )}
      </section>
    </main>
  );
}
