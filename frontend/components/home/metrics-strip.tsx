import type { MetricDto } from "@cmsjs/cms/model";

export function MetricsStrip({ metrics }: { metrics: readonly MetricDto[] }) {
  if (metrics.length === 0) return null;

  return (
    <section
      aria-label="I numeri della società"
      className="border-y border-outline-soft/60 bg-surface-low"
    >
      <div className="site-container py-8 md:py-12">
        <dl className="grid grid-cols-2 gap-y-8 md:grid-cols-4 md:gap-y-0">
          {metrics.map((metric, index) => (
            <div
              className={`flex min-w-0 flex-col px-4 first:pl-0 last:pr-0 md:px-7 ${
                index % 2 === 1
                  ? "border-l border-outline-soft/70"
                  : "md:border-l md:border-outline-soft/70 md:first:border-l-0"
              }`}
              key={`${metric.value}-${metric.label}`}
            >
              <dt className="order-2 mt-2 text-[0.625rem] leading-4 font-bold tracking-editorial text-ink-muted uppercase md:text-[0.6875rem]">
                {metric.label}
              </dt>
              <dd className="order-1 font-display text-3xl leading-9 font-semibold tracking-[-0.03em] text-ink tabular-nums md:text-[2.5rem] md:leading-[3rem]">
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
