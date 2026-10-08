export function LoadingSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16"
    >
      <p className="sr-only">Caricamento dei contenuti</p>
      <div className="animate-pulse space-y-8 motion-reduce:animate-none">
        <div className="h-3 w-24 rounded-card bg-surface-raised" />
        <div className="h-12 w-2/3 max-w-xl rounded-card bg-surface-raised" />
        <div className="h-4 w-full rounded-card bg-surface-raised" />
        <div className="h-4 w-5/6 rounded-card bg-surface-raised" />
        <div className="h-64 w-full rounded-card bg-surface-raised" />
      </div>
    </main>
  );
}
