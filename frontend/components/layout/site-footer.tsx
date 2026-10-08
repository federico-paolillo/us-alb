import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border" id="contatti">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-6 sm:px-8">
        <p className="font-mono text-xs tracking-[0.08em] text-muted">
          U.S. Albatese · Versione:{" "}
          {process.env.NEXT_PUBLIC_APP_VERSION ?? "development"}
        </p>
        <nav aria-label="Piè di pagina">
          <ul className="flex flex-wrap gap-x-4 gap-y-2 font-mono text-xs text-muted">
            <li>
              <Link className="hover:text-text" href="/">
                Home
              </Link>
            </li>
            <li>
              <Link className="hover:text-text" href="/chi-siamo">
                Chi siamo
              </Link>
            </li>
            <li>
              <Link className="hover:text-text" href="/attivita">
                Attività
              </Link>
            </li>
            <li>
              <Link className="hover:text-text" href="/notizie">
                Notizie
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
