export function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="mt-6 rounded-editorial-lg border border-dashed border-outline-soft bg-surface-low px-5 py-7">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">{body}</p>
    </div>
  );
}
