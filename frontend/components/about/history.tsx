import type { BlocksDto } from "@cmsjs/cms/model";
import { Blocks } from "@cmsjs/components/shared/content";

export function HistorySection({ history }: { history: BlocksDto }) {
  if (history.length === 0) return null;

  return (
    <section
      aria-labelledby="storia-heading"
      className="scroll-mt-28 bg-surface-low py-14 md:py-24"
      id="storia"
    >
      <div className="site-container grid gap-8 md:grid-cols-12 md:gap-12 lg:gap-16">
        <header className="md:col-span-4">
          <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
            Storia e missione
          </p>
          <h2
            className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
            id="storia-heading"
          >
            Radici, sport e comunità
          </h2>
          <div aria-hidden="true" className="mt-6 h-0.5 w-12 bg-gold-display" />
        </header>
        <div className="max-w-3xl md:col-span-8 md:pt-1">
          <Blocks blocks={history} />
        </div>
      </div>
    </section>
  );
}
