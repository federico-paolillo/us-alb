import type { ValueDto } from "@cmsjs/cms/model";

export function ValuesSection({ values }: { values: readonly ValueDto[] }) {
  if (values.length === 0) return null;

  return (
    <section
      aria-labelledby="valori-heading"
      className="scroll-mt-28 border-y border-outline-soft/40 bg-surface-lowest py-14 md:py-24"
      id="valori"
    >
      <div className="site-container">
        <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
          I nostri principi
        </p>
        <h2
          className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
          id="valori-heading"
        >
          L’anima giallonera
        </h2>

        <ul className="mt-9 grid gap-5 md:mt-12 md:grid-cols-3 md:gap-8">
          {values.map((value, index) => (
            <li key={`${value.title}-${value.body}`}>
              <article className="h-full rounded-editorial-xl border border-outline-soft/50 bg-surface-low p-6 shadow-card md:p-8">
                <div className="flex items-center gap-3" aria-hidden="true">
                  <span className="font-display text-sm font-bold text-gold-deep tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="h-px flex-1 bg-outline-soft/70" />
                </div>
                {value.title.trim() && (
                  <h3 className="mt-6 font-display text-xl leading-7 font-semibold text-ink">
                    {value.title}
                  </h3>
                )}
                {value.body.trim() && (
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink-muted">
                    {value.body}
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
