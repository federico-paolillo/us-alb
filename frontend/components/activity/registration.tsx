import type { RegistrationStepDto } from "@cmsjs/cms/model";
import Link from "next/link";

export function RegistrationSection({
  introduction,
  steps,
}: {
  introduction: string;
  steps: readonly RegistrationStepDto[];
}) {
  if (!introduction.trim() && steps.length === 0) return null;

  return (
    <section
      aria-labelledby="iscrizioni-heading"
      className="scroll-mt-28 border-t border-outline-soft/40 bg-surface-low py-14 md:py-24"
      id="iscrizioni"
    >
      <div className="site-container">
        <div className="max-w-3xl">
          <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
            Informazioni e accoglienza
          </p>
          <h2
            className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
            id="iscrizioni-heading"
          >
            Guida alle iscrizioni
          </h2>
          {introduction.trim() && (
            <p className="mt-4 whitespace-pre-line text-base leading-7 text-ink-muted md:text-body-lg">
              {introduction}
            </p>
          )}
        </div>

        {steps.length > 0 && (
          <ol className="mt-9 grid list-none gap-5 md:mt-12 md:grid-cols-3 md:gap-7">
            {steps.map((step, index) => (
              <li key={`${step.order}-${step.title}-${index}`}>
                <article className="flex h-full flex-col rounded-editorial-xl border border-outline-soft/50 bg-surface-lowest p-6 shadow-card md:p-8">
                  <div aria-hidden="true" className="flex items-center gap-3">
                    <span className="font-display text-3xl leading-9 font-bold text-gold-deep tabular-nums">
                      {String(step.order).padStart(2, "0")}
                    </span>
                    <span className="h-px flex-1 bg-outline-soft/70" />
                  </div>
                  {step.title.trim() && (
                    <h3 className="mt-6 font-display text-xl leading-7 font-semibold text-ink">
                      {step.title}
                    </h3>
                  )}
                  {step.body.trim() && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink-muted">
                      {step.body}
                    </p>
                  )}
                  {step.note?.trim() && (
                    <p className="mt-5 border-t border-outline-soft/60 pt-4 text-xs leading-5 font-semibold text-ink-variant">
                      {step.note}
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ol>
        )}

        <Link
          className="mt-9 inline-flex min-h-11 items-center gap-3 rounded-editorial-md bg-inverse px-5 py-3 text-xs font-bold tracking-editorial text-inverse-text uppercase shadow-card transition-colors hover:bg-ink md:mt-12"
          href="/#contatti"
        >
          Contatta la segreteria
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
