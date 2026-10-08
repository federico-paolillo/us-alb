import { ClubBrand } from "@cmsjs/components/layout/club-brand";
import Link from "next/link";

const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "development";

export function SiteFooter() {
  return (
    <footer
      className="border-t border-outline-soft bg-inverse text-inverse-text"
      id="contatti"
    >
      <div className="site-container py-14 md:py-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <ClubBrand inverse />
            <p className="mt-5 max-w-md text-sm leading-6 text-inverse-text/70">
              Polisportiva dilettantistica di Albate: dal 1968 lo sport è un
              luogo di educazione, incontro e appartenenza alla comunità.
            </p>
            <p className="mt-5 text-xs font-semibold tracking-editorial text-gold-pale uppercase">
              Affiliazioni CSI • FIDAL
            </p>
          </div>

          <div className="md:col-span-4">
            <h2 className="text-xs font-semibold tracking-editorial text-inverse-text uppercase">
              Sedi e contatti
            </h2>
            <address className="mt-4 space-y-4 text-sm leading-6 text-inverse-text/70 not-italic">
              <p>
                <strong className="block font-semibold text-inverse-text">
                  Centro Sportivo Giallonero
                </strong>
                Via della Comunità 68, Albate (CO)
              </p>
              <p>
                <strong className="block font-semibold text-inverse-text">
                  Cortile Sportivo dell’Oratorio
                </strong>
                Piazza del Gioco 7, Albate (CO)
              </p>
              <a
                className="inline-block text-gold-pale underline decoration-gold-pale/40 underline-offset-4 hover:text-white"
                href="mailto:segreteria@usalbatese.example"
              >
                segreteria@usalbatese.example
              </a>
            </address>
          </div>

          <nav aria-label="Piè di pagina" className="md:col-span-3">
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
