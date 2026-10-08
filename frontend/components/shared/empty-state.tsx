export function EmptyState({ label }: { label: string }) {
  return (
    <p className="mt-10 rounded-card border border-dashed border-border bg-surface px-5 py-8 text-muted">
      Nessun contenuto pubblicato per {label}.
    </p>
  );
}
