import type { TimelineEntryDto } from "@cmsjs/cms/model";

export function TimelineSection({
  entries,
}: {
  entries: readonly TimelineEntryDto[];
}) {
  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby="cronologia-heading"
      className="scroll-mt-28 bg-surface-canvas py-14 md:py-24"
      id="cronologia"
    >
      <div className="site-container">
        <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
          Memoria e tappe
        </p>
        <h2
          className="mt-2 max-w-2xl font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
          id="cronologia-heading"
        >
          La nostra storia nel tempo
        </h2>

        <ol className="relative mt-9 space-y-6 pl-7 before:absolute before:top-3 before:bottom-3 before:left-2 before:w-px before:bg-outline-soft md:mt-14 md:grid md:grid-cols-3 md:gap-8 md:space-y-0 md:pl-0 md:before:hidden">
          {entries.map((entry) => (
            <li
              className="relative rounded-editorial-xl border border-outline-soft/50 bg-surface-lowest p-6 shadow-card md:p-8"
              key={`${entry.year}-${entry.title}-${entry.body}`}
            >
              <span
                aria-hidden="true"
                className="absolute top-7 -left-[1.625rem] h-3 w-3 rounded-full bg-gold-display ring-4 ring-surface-canvas md:static md:mb-6 md:block md:h-1 md:w-10 md:rounded-none md:ring-0"
              />
              {entry.year.trim() && (
                <p className="font-display text-3xl leading-9 font-bold tracking-[-0.03em] text-ink tabular-nums">
                  {entry.year}
                </p>
              )}
              {entry.title.trim() && (
                <h3 className="mt-2 font-display text-xl leading-7 font-semibold text-ink">
                  {entry.title}
                </h3>
              )}
              {entry.body.trim() && (
                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink-muted">
                  {entry.body}
                </p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
