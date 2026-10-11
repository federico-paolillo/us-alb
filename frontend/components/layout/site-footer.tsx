import { ClubBrand } from "@cmsjs/components/layout/club-brand";
import Link from "next/link";

const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "development";

export function SiteFooter() {
  return (
    <footer className="border-t border-outline-soft bg-inverse text-inverse-text">
      <div className="site-container py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-7">
            <ClubBrand inverse />
            <p className="mt-5 max-w-md text-sm leading-6 text-inverse-text/70">
              Polisportiva dilettantistica di Albate: dal 1968 lo sport è un
              luogo di educazione, incontro e appartenenza alla comunità.
            </p>
            <p className="mt-5 text-xs font-semibold tracking-editorial text-gold-pale uppercase">
              Affiliazioni CSI • FIDAL
            </p>
          </div>

          <nav
            aria-label="Piè di pagina"
            className="md:col-span-5 md:justify-self-end"
          >
            <h2 className="text-xs font-semibold tracking-editorial text-inverse-text uppercase">
              Navigazione
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-inverse-text/70">
              <li>
                <Link className="hover:text-gold-pale" href="/chi-siamo">
                  Chi siamo
                </Link>
              </li>
              <li>
                <Link className="hover:text-gold-pale" href="/attivita">
                  Attività
                </Link>
              </li>
              <li>
                <Link className="hover:text-gold-pale" href="/notizie">
                  Notizie e calendario
                </Link>
              </li>
              <li>
                <Link
                  className="hover:text-gold-pale"
                  href="/notizie#documenti"
                >
                  Documenti ufficiali
                </Link>
              </li>
              <li>
                <Link className="hover:text-gold-pale" href="/#contatti">
                  Contatti
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-inverse-text/15 pt-6 text-xs text-inverse-text/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Unione Sportiva Albatese ASD</p>
          <p className="tabular-nums">Versione {version}</p>
        </div>
      </div>
    </footer>
  );
}
