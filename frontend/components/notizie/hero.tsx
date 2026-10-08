const sectionLinks = [
  { href: "#calendario", label: "Calendario" },
  { href: "#notizie", label: "Notizie" },
  { href: "#documenti", label: "Documenti" },
] as const;

export function NotizieHero() {
  return (
    <section
      aria-labelledby="notizie-heading"
      className="border-b border-outline-soft/50 bg-surface-lowest py-12 md:py-20 lg:py-24"
    >
      <div className="site-container">
        <div className="grid items-end gap-9 md:grid-cols-12 md:gap-12 lg:gap-16">
          <div className="md:col-span-9">
            <p className="flex items-center gap-3 text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
              <span aria-hidden="true" className="h-0.5 w-6 bg-gold-display" />
              Notiziario e calendario
            </p>
            <h1
              className="mt-5 max-w-5xl font-display text-[2.25rem] leading-[2.75rem] font-bold tracking-[-0.02em] text-ink md:mt-6 md:text-display md:leading-[4rem] md:tracking-display"
              id="notizie-heading"
            >
              Cronache di campo, appuntamenti e vita del club.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-ink-muted md:mt-7 md:text-body-lg">
              Risultati, prossime gare, storie della società e documenti
              ufficiali: tutto ciò che serve per seguire l’U.S. Albatese.
            </p>
          </div>

          <nav aria-label="In questa pagina" className="md:col-span-3">
            <ul className="flex flex-wrap gap-2 md:justify-end">
              {sectionLinks.map((link) => (
                <li key={link.href}>
                  <a
                    className="inline-flex min-h-11 items-center rounded-editorial-md border border-outline-soft/70 bg-surface-low px-4 py-2.5 text-xs font-bold tracking-editorial text-ink-variant uppercase transition-colors hover:border-gold-display hover:bg-gold-pale/50 hover:text-ink"
                    href={link.href}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </section>
  );
}
