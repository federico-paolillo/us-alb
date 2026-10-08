import Link from "next/link";

export function DocumentsIntro({
  eyebrow,
  introduction,
  title,
}: {
  eyebrow: string;
  introduction: string;
  title: string;
}) {
  if (!title.trim() && !introduction.trim()) return null;

  return (
    <section
      aria-labelledby="documenti-heading"
      className="scroll-mt-28 bg-surface-low py-14 md:py-20"
      id="documenti"
    >
      <div className="site-container">
        <div className="rounded-editorial-xl border border-outline-soft/50 bg-surface-lowest p-6 shadow-card md:flex md:items-center md:justify-between md:gap-12 md:p-10 lg:p-14">
          <div className="max-w-2xl">
            {eyebrow.trim() && (
              <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
                {eyebrow}
              </p>
            )}
            <h2
              className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink"
              id="documenti-heading"
            >
              {title.trim() || "Documenti"}
            </h2>
            {introduction.trim() && (
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink-muted md:text-base md:leading-7">
                {introduction}
              </p>
            )}
          </div>
          <Link
            className="mt-7 inline-flex min-h-11 shrink-0 items-center gap-3 rounded-editorial-md bg-inverse px-5 py-3 text-xs font-bold tracking-editorial text-inverse-text uppercase shadow-card transition-colors hover:bg-ink md:mt-0"
            href="/notizie#documenti"
          >
            Consulta i documenti ufficiali
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
