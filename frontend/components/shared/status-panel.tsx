import type { ReactNode } from "react";

export function StatusPanel({
  action,
  body,
  eyebrow,
  title,
  tone = "default",
}: {
  action?: ReactNode;
  body: string;
  eyebrow: string;
  title: string;
  tone?: "default" | "error";
}) {
  return (
    <div className="relative overflow-hidden rounded-editorial-xl border border-outline-soft bg-surface-lowest p-7 shadow-card sm:p-10">
      <span
        aria-hidden="true"
        className={`absolute top-0 left-0 h-1 w-20 ${tone === "error" ? "bg-error" : "bg-gold-display"}`}
      />
      <p
        className={`font-body text-xs font-bold tracking-editorial uppercase ${tone === "error" ? "text-error" : "text-gold-deep"}`}
      >
        {eyebrow}
      </p>
      <h1 className="mt-4 max-w-2xl font-display text-3xl leading-10 font-semibold tracking-[-0.02em] text-ink sm:text-4xl sm:leading-[3rem]">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
        {body}
      </p>
      {action && <div className="mt-7 flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}
