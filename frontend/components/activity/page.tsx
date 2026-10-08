import type { ActivityPageDto } from "@cmsjs/cms/model";
import { CmsImage } from "@cmsjs/components/shared/content";

const programGroupLabels: Record<
  ActivityPageDto["programs"][number]["group"],
  string
> = {
  "youth-football": "Settore giovanile",
  "competitive-football": "Calcio agonistico",
  athletics: "Atletica",
  community: "Comunità",
};

export function ActivityPage({ page }: { page: ActivityPageDto }) {
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
        <h2 className="text-2xl font-semibold text-text">Programmi</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {page.programs.map((program) => (
            <article
              className="rounded-card border border-border p-5"
              key={`${program.group}-${program.title}`}
            >
              {program.image && (
                <div className="mb-4">
                  <CmsImage
                    image={program.image}
                    sizes="(min-width: 768px) 544px, calc(100vw - 80px)"
                  />
                </div>
              )}
              <p className="text-xs uppercase text-accent">
                {programGroupLabels[program.group]}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-text">
                {program.title}
              </h3>
              {program.audience && (
                <p className="mt-1 text-sm text-muted">{program.audience}</p>
              )}
              <p className="mt-3 text-muted">{program.summary}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-text">Orari</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {page.schedules.map((schedule) => (
            <article
              className="border-l-2 border-accent pl-5"
              key={`${schedule.title}-${schedule.days}`}
            >
              <h3 className="font-semibold text-text">{schedule.title}</h3>
              <p className="mt-1 text-muted">
                {schedule.days}, {schedule.time} · {schedule.venue}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-text">Sedi</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {page.venues.map((venue) => (
            <article key={venue.name}>
              <h3 className="font-semibold text-text">{venue.name}</h3>
              <p className="text-sm text-muted">{venue.address}</p>
              <p className="mt-2 text-muted">{venue.details}</p>
            </article>
          ))}
        </div>
      </section>
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {[page.openTeamFeature, page.athleticsFeature].map((feature) => (
          <article
            className="rounded-card border border-border p-6"
            key={feature.title}
          >
            {feature.image && (
              <div className="mb-4">
                <CmsImage
                  image={feature.image}
                  sizes="(min-width: 768px) 544px, calc(100vw - 88px)"
                />
              </div>
            )}
            {feature.eyebrow && (
              <p className="text-xs uppercase text-accent">{feature.eyebrow}</p>
            )}
            <h2 className="mt-2 text-2xl font-semibold text-text">
              {feature.title}
            </h2>
            <p className="mt-3 text-muted">{feature.body}</p>
          </article>
        ))}
      </div>
      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-text">Iscrizioni</h2>
        <p className="mt-3 max-w-3xl text-muted">
          {page.registrationIntroduction}
        </p>
        <ol className="mt-6 space-y-5">
          {page.registrationSteps.map((step) => (
            <li className="flex gap-4" key={`${step.order}-${step.title}`}>
              <span className="text-accent">{step.order}</span>
              <div>
                <h3 className="font-semibold text-text">{step.title}</h3>
                <p className="mt-1 text-muted">{step.body}</p>
                {step.note && (
                  <p className="mt-1 text-sm text-muted">{step.note}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
