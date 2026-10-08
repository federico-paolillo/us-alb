import type { SportProgramDto, SportProgramGroup } from "@cmsjs/cms/model";
import { ActivityMedia } from "@cmsjs/components/activity/activity-media";

const groupOrder = Object.freeze([
  "youth-football",
  "competitive-football",
  "athletics",
  "community",
] as const satisfies readonly SportProgramGroup[]);

const groupPresentation: Record<
  SportProgramGroup,
  { label: string; heading: string }
> = {
  "youth-football": {
    label: "Scuola calcio",
    heading: "Primi passi e settore giovanile",
  },
  "competitive-football": {
    label: "Calcio agonistico",
    heading: "Squadre giovanili e Open",
  },
  athletics: {
    label: "Atletica FIDAL",
    heading: "Pista, corsa e coordinazione",
  },
  community: {
    label: "Corsi comunitari",
    heading: "Movimento aperto al quartiere",
  },
};

export function ProgramsSection({
  programs,
}: {
  programs: readonly SportProgramDto[];
}) {
  if (programs.length === 0) return null;

  return (
    <section
      aria-labelledby="programmi-heading"
      className="scroll-mt-28 bg-surface-canvas py-14 md:py-24"
      id="programmi"
    >
      <div className="site-container">
        <div className="max-w-3xl">
          <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
            Proposte 2026/27
          </p>
          <h2
            className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
            id="programmi-heading"
          >
            Sport per ogni passo
          </h2>
          <p className="mt-4 text-sm leading-6 text-ink-muted md:text-base md:leading-7">
            Esplora i percorsi disponibili e trova il ritmo più adatto a età,
            esperienza e desiderio di stare insieme.
          </p>
        </div>

        <div className="mt-10 space-y-14 md:mt-16 md:space-y-20">
          {groupOrder.map((group, groupIndex) => {
            const groupPrograms = programs.filter(
              (program) => program.group === group,
            );
            if (groupPrograms.length === 0) return null;

            const presentation = groupPresentation[group];
            const headingId = `programmi-${group}-heading`;

            return (
              <section
                aria-labelledby={headingId}
                className="scroll-mt-28"
                id={`programmi-${group}`}
                key={group}
              >
                <div className="flex items-end gap-4 border-b border-outline-soft/60 pb-5">
                  <span
                    aria-hidden="true"
                    className="font-display text-sm font-bold text-gold-deep tabular-nums"
                  >
                    {String(groupIndex + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-[0.625rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
                      {presentation.label}
                    </p>
                    <h3
                      className="mt-1 font-display text-xl leading-7 font-semibold text-ink md:text-headline-md"
                      id={headingId}
                    >
                      {presentation.heading}
                    </h3>
                  </div>
                </div>

                <ul className="mt-7 grid gap-6 md:grid-cols-2 md:gap-8">
                  {groupPrograms.map((program, index) => (
                    <li
                      className={
                        groupPrograms.length === 1 ? "md:max-w-xl" : ""
                      }
                      key={`${program.group}-${program.title}-${index}`}
                    >
                      <article className="flex h-full flex-col overflow-hidden rounded-editorial-xl border border-outline-soft/50 bg-surface-lowest shadow-card">
                        {program.image && (
                          <figure className="relative aspect-[16/10] overflow-hidden bg-surface-container">
                            <ActivityMedia
                              image={program.image}
                              sizes="(min-width: 1280px) 576px, (min-width: 768px) 46vw, calc(100vw - 40px)"
                            />
                          </figure>
                        )}
                        <div className="flex flex-1 flex-col p-5 md:p-7">
                          {program.audience?.trim() && (
                            <p className="text-[0.625rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
                              {program.audience}
                            </p>
                          )}
                          {program.title.trim() && (
                            <h4 className="mt-2 font-display text-xl leading-7 font-semibold text-ink md:text-2xl md:leading-8">
                              {program.title}
                            </h4>
                          )}
                          {program.summary.trim() && (
                            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink-muted">
                              {program.summary}
                            </p>
                          )}
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
