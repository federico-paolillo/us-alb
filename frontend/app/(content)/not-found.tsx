import { StatusPanel } from "@cmsjs/components/shared/status-panel";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-container py-12 sm:py-16">
      <StatusPanel
        action={
          <>
            <Link
              className="rounded-editorial-md bg-inverse px-5 py-3 text-sm font-semibold text-inverse-text transition-colors hover:bg-ink"
              href="/"
            >
              Torna alla Home
            </Link>
            <Link
              className="rounded-editorial-md border border-outline px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-low"
              href="/notizie"
            >
              Vai alle Notizie
            </Link>
          </>
        }
        body="Il contenuto richiesto non esiste, è stato spostato oppure non è ancora pubblicato."
        eyebrow="Errore 404"
        title="Pagina non trovata"
      />
    </main>
  );
}
