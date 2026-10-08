"use client";

import "@cmsjs/app/globals.css";

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="it">
      <body className="flex min-h-screen flex-col">
        <title>
          Errore applicazione | U.S. Albatese - Versione{" "}
          {process.env.NEXT_PUBLIC_APP_VERSION ?? "development"}
        </title>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-12 sm:px-8">
          <p className="font-mono text-xs font-medium tracking-[0.18em] text-accent uppercase">
            Errore applicazione
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text">
            Impossibile caricare il sito
          </h1>
          <p className="mt-5 text-muted">Riprova tra poco.</p>
          <button
            className="mt-8 w-fit rounded-card border border-accent px-4 py-2 font-mono text-sm text-accent transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onClick={retry}
            type="button"
          >
            Riprova
          </button>
        </main>
      </body>
    </html>
  );
}
