import type { AboutPageDto } from "@cmsjs/cms/model";
import { Blocks, CmsImage } from "@cmsjs/components/shared/content";

export function AboutPage({ page }: { page: AboutPageDto }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">
        {page.eyebrow}
      </p>
      <h1 className="mt-4 text-4xl font-semibold text-text sm:text-6xl">
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
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-semibold text-text">
          La nostra storia
        </h2>
        <Blocks blocks={page.history} />
      </section>
      <section className="mt-12 grid gap-5 md:grid-cols-2">
        {page.timeline.map((entry) => (
          <article
            className="border-l-2 border-accent pl-5"
            key={`${entry.year}-${entry.title}`}
          >
            <p className="text-sm text-accent">{entry.year}</p>
            <h3 className="mt-1 text-xl font-semibold text-text">
              {entry.title}
            </h3>
            <p className="mt-2 text-muted">{entry.body}</p>
          </article>
        ))}
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-text">I nostri valori</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {page.values.map((value) => (
            <article
              className="rounded-card border border-border p-5"
              key={value.title}
            >
              <h3 className="font-semibold text-text">{value.title}</h3>
              <p className="mt-2 text-muted">{value.body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-text">
          Consiglio direttivo
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {page.boardMembers.map((member) => (
            <article key={`${member.name}-${member.role}`}>
              {member.portrait && (
                <div className="mb-4">
                  <CmsImage
                    image={member.portrait}
                    sizes="(min-width: 768px) 352px, calc(100vw - 40px)"
                  />
                </div>
              )}
              <h3 className="font-semibold text-text">{member.name}</h3>
              <p className="text-sm text-accent">{member.role}</p>
              <p className="mt-2 text-muted">{member.bio}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-text">Impianti</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {page.facilities.map((facility) => (
            <article
              className="rounded-card border border-border p-5"
              key={facility.name}
            >
              {facility.image && (
                <div className="mb-4">
                  <CmsImage
                    image={facility.image}
                    sizes="(min-width: 768px) 544px, calc(100vw - 80px)"
                  />
                </div>
              )}
              <h3 className="font-semibold text-text">{facility.name}</h3>
              <p className="mt-2 text-muted">{facility.summary}</p>
              <address className="mt-2 text-sm text-muted not-italic">
                {facility.address}
              </address>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-12 border-t border-border pt-8">
        <p className="text-xs uppercase text-accent">{page.documentEyebrow}</p>
        <h2 className="mt-2 text-2xl font-semibold text-text">
          {page.documentTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-muted">{page.documentIntroduction}</p>
      </section>
    </main>
  );
}
