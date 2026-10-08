import type { OfficialDocumentDto } from "@cmsjs/cms/model";
import { EmptyState } from "@cmsjs/components/shared/empty-state";

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

export function DocumentsSection({
  documents,
}: {
  documents: OfficialDocumentDto[];
}) {
  return (
    <section
      aria-labelledby="documents-heading"
      className="bg-surface-low py-14 md:py-24"
      id="documenti"
    >
      <div className="site-container">
        <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
          Documenti e trasparenza
        </p>
        <h2
          className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
          id="documents-heading"
        >
          Bollettini e modulistica ufficiale
        </h2>

        {documents.length === 0 ? (
          <EmptyState
            body="La modulistica e gli atti ufficiali saranno disponibili in questa sezione."
            title="Nessun documento pubblicato"
          />
        ) : (
          <ul className="mt-9 grid gap-4 md:mt-12 md:grid-cols-3 md:gap-6">
            {documents.map((document) => {
              const title = document.title.trim() || document.file.name;
              return (
                <li key={`${document.displayOrder}-${document.file.name}`}>
                  <a
                    aria-label={`Scarica ${title} (PDF)`}
                    className="group flex h-full min-h-48 flex-col rounded-editorial-lg border border-outline-soft/60 bg-surface-lowest p-5 shadow-card transition-shadow hover:shadow-card-raised md:p-6"
                    download={document.file.name}
                    href={document.file.url}
                    type="application/pdf"
                  >
                    <div className="flex items-center justify-between gap-4 text-[0.6875rem] leading-4 font-bold tracking-editorial uppercase">
                      <span className="text-gold-deep">PDF</span>
                      {hasText(document.season) && (
                        <span className="text-ink-muted">
                          {document.season}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-5 font-display text-lg leading-7 font-semibold text-ink transition-colors group-hover:text-gold-deep">
                      {title}
                    </h3>
                    {hasText(document.category) && (
                      <p className="mt-2 text-sm leading-6 text-ink-muted">
                        {document.category}
                      </p>
                    )}
                    <p className="mt-auto break-all pt-6 text-xs leading-5 text-ink-variant">
                      {document.file.name}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold tracking-editorial text-ink uppercase">
                      Scarica il documento
                      <span aria-hidden="true">↓</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
