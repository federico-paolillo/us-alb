"use client";

import "@cmsjs/app/globals.css";
import { epilogue, manrope } from "@cmsjs/app/fonts";
import { ClubBrand } from "@cmsjs/components/layout/club-brand";
import { StatusPanel } from "@cmsjs/components/shared/status-panel";

const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "development";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html
      className={`${epilogue.variable} ${manrope.variable}`}
      data-scroll-behavior="smooth"
      lang="it"
    >
      <body className="flex min-h-screen flex-col bg-surface-canvas antialiased">
        <title>Errore applicazione | U.S. Albatese - Versione {version}</title>
        <header className="border-b border-outline-soft bg-surface-lowest">
          <div className="site-container flex h-20 items-center">
            <ClubBrand arrangement="compact" />
          </div>
        </header>
        <main className="site-container flex flex-1 flex-col justify-center py-12 sm:py-16">
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
            body="Il sito non è disponibile in questo momento. Riprova tra poco."
            eyebrow="Errore applicazione"
            title="Non riusciamo a caricare il sito"
            tone="error"
          />
        </main>
        <footer className="border-t border-outline-soft bg-surface-lowest">
          <div className="site-container py-5 text-xs text-ink-muted tabular-nums">
            Versione {version}
          </div>
        </footer>
      </body>
    </html>
  );
}
