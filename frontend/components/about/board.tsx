import type { BoardMemberDto } from "@cmsjs/cms/model";
import { AboutMedia } from "@cmsjs/components/about/about-media";

export function BoardSection({
  members,
}: {
  members: readonly BoardMemberDto[];
}) {
  if (members.length === 0) return null;

  return (
    <section
      aria-labelledby="direttivo-heading"
      className="scroll-mt-28 bg-surface-low py-14 md:py-24"
      id="direttivo"
    >
      <div className="site-container">
        <div className="max-w-3xl">
          <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
            Organizzazione associativa
          </p>
          <h2
            className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
            id="direttivo-heading"
          >
            Il consiglio nel racconto editoriale
          </h2>
          <p className="mt-4 text-sm leading-6 text-ink-muted">
            Profili narrativi con nomi di fantasia; non indicano le cariche
            ufficiali in essere.
          </p>
        </div>

        <ul className="mt-9 grid gap-5 sm:grid-cols-2 md:mt-12 lg:grid-cols-4 lg:gap-7">
          {members.map((member) => (
            <li key={`${member.name}-${member.role}-${member.bio}`}>
              <article className="flex h-full flex-col overflow-hidden rounded-editorial-xl border border-outline-soft/50 bg-surface-lowest shadow-card">
                {member.portrait && (
                  <figure className="relative aspect-[4/5] overflow-hidden bg-surface-container">
                    <AboutMedia
                      image={member.portrait}
                      sizes="(min-width: 1280px) 264px, (min-width: 1024px) 22vw, (min-width: 640px) 44vw, calc(100vw - 40px)"
                    />
                  </figure>
                )}
                <div className="flex flex-1 flex-col p-6">
                  {member.role.trim() && (
                    <p className="text-[0.625rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
                      {member.role}
                    </p>
                  )}
                  {member.name.trim() && (
                    <h3 className="mt-2 font-display text-xl leading-7 font-semibold text-ink">
                      {member.name}
                    </h3>
                  )}
                  {member.bio.trim() && (
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-ink-muted">
                      {member.bio}
                    </p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
