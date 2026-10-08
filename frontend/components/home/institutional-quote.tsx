import type { InstitutionalQuoteDto } from "@cmsjs/cms/model";

export function InstitutionalQuote({
  quote,
}: {
  quote: InstitutionalQuoteDto;
}) {
  if (!quote.text.trim() || !quote.attribution.trim()) return null;

  return (
    <section
      aria-labelledby="comunita-heading"
      className="border-y border-outline-soft/50 bg-surface-lowest py-16 md:py-28"
      id="comunita"
    >
      <div className="site-container">
        <h2
          className="text-center text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase"
          id="comunita-heading"
        >
          Comunità ed educazione
        </h2>
        <blockquote className="mx-auto mt-7 max-w-4xl text-center">
          <p className="font-display text-2xl leading-9 font-medium tracking-[-0.02em] text-ink md:text-[2.5rem] md:leading-[3.25rem]">
            “{quote.text}”
          </p>
          <footer className="mt-8">
            <cite className="font-display text-sm font-semibold text-ink not-italic">
              {quote.attribution}
            </cite>
            {quote.role && (
              <p className="mt-1 text-[0.6875rem] font-bold tracking-editorial text-ink-muted uppercase">
                {quote.role}
              </p>
            )}
          </footer>
        </blockquote>
        <div
          aria-hidden="true"
          className="mx-auto mt-10 h-px w-12 bg-gold-display"
        />
      </div>
    </section>
  );
}
