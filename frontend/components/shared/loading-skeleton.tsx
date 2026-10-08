export function LoadingSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="site-container py-12 sm:py-16"
    >
      <p className="sr-only">Caricamento dei contenuti in corso</p>
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="h-3 w-28 animate-pulse rounded-editorial-sm bg-gold-pale motion-reduce:animate-none" />
          <div className="h-11 w-3/4 max-w-2xl animate-pulse rounded-editorial-md bg-surface-high motion-reduce:animate-none" />
          <div className="h-4 w-full max-w-3xl animate-pulse rounded-editorial-sm bg-surface-high motion-reduce:animate-none" />
          <div className="h-4 w-5/6 max-w-2xl animate-pulse rounded-editorial-sm bg-surface-high motion-reduce:animate-none" />
        </div>
        <div className="rounded-editorial-xl border border-outline-soft/70 bg-surface-lowest p-6 shadow-card sm:p-8">
          <div className="h-48 w-full animate-pulse rounded-editorial-lg bg-surface-low motion-reduce:animate-none sm:h-64" />
        </div>
      </div>
    </main>
  );
}
