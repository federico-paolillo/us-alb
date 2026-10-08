import type { HomePageDto } from "@cmsjs/cms/model";
import { CmsImage } from "@cmsjs/components/shared/content";

export function HomePage({ page }: { page: HomePageDto }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="font-mono text-xs font-medium tracking-[0.18em] text-accent uppercase">
        {page.eyebrow}
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-text sm:text-6xl">
        {page.headline}
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
        {page.introduction}
      </p>
      <div className="mt-10">
        <CmsImage
          image={page.heroImage}
          loading="eager"
          sizes="(min-width: 1280px) 1152px, calc(100vw - 40px)"
        />
      </div>
      <dl className="mt-10 grid gap-4 sm:grid-cols-3">
        {page.metrics.map((metric) => (
          <div
            className="rounded-card border border-border p-5"
            key={`${metric.value}-${metric.label}`}
          >
            <dt className="text-sm text-muted">{metric.label}</dt>
            <dd className="mt-2 text-2xl font-semibold text-text">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>
      <blockquote className="mt-12 border-l-2 border-accent pl-6 text-xl text-text">
        <p>{page.institutionalQuote.text}</p>
        <footer className="mt-3 text-sm text-muted">
          {page.institutionalQuote.attribution}
          {page.institutionalQuote.role
            ? `, ${page.institutionalQuote.role}`
            : ""}
        </footer>
      </blockquote>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-text">Le nostre attività</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {page.activityTeasers.map((teaser) => (
            <article
              className="rounded-card border border-border p-5"
              key={teaser.title}
            >
              {teaser.image && (
                <div className="mb-4">
                  <CmsImage
                    image={teaser.image}
                    sizes="(min-width: 768px) 352px, calc(100vw - 80px)"
                  />
                </div>
              )}
              {teaser.eyebrow && (
                <p className="text-xs uppercase text-accent">
                  {teaser.eyebrow}
                </p>
              )}
              <h3 className="mt-2 text-xl font-semibold text-text">
                {teaser.title}
              </h3>
              <p className="mt-3 text-muted">{teaser.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
