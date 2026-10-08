export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="font-mono text-xs font-medium tracking-[0.18em] text-accent uppercase">
        404
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text">
        Pagina non trovata
      </h1>
      <p className="mt-5 text-lg leading-8 text-muted">
        Il contenuto richiesto non esiste o non è pubblicato.
      </p>
    </main>
  );
}
