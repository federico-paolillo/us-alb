"use client";

import { StatusPanel } from "@cmsjs/components/shared/status-panel";

export default function ContentError({ retry }: { retry: () => void }) {
  return (
    <main className="site-container py-12 sm:py-16">
      <StatusPanel
        action={
          <button
            className="rounded-editorial-md bg-inverse px-5 py-3 font-body text-sm font-semibold text-inverse-text transition-colors hover:bg-ink"
            onClick={retry}
            type="button"
          >
            Riprova
          </button>
        }
        body="Il contenuto non è disponibile in questo momento. Riprova tra poco."
        eyebrow="Errore contenuto"
        title="Non riusciamo a caricare questa pagina"
        tone="error"
      />
    </main>
  );
}
