import type { FeatureDto } from "@cmsjs/cms/model";
import { ActivityMedia } from "@cmsjs/components/activity/activity-media";

export function FeatureSection({
  fallbackLabel,
  feature,
  id,
  mediaPosition,
}: {
  feature: FeatureDto;
  id: "squadra-open" | "atletica-in-evidenza";
  fallbackLabel: "Squadra Open" | "Atletica";
  mediaPosition: "start" | "end";
}) {
  const hasEyebrow = Boolean(feature.eyebrow?.trim());
  const hasTitle = Boolean(feature.title.trim());
  const hasBody = Boolean(feature.body.trim());
  if (!hasEyebrow && !hasTitle && !hasBody && !feature.image) return null;

  const headingId = `${id}-heading`;
  const isMediaAtEnd = mediaPosition === "end";

  return (
    <section
      aria-labelledby={headingId}
      className={`scroll-mt-28 py-14 md:py-24 ${
        isMediaAtEnd
          ? "bg-surface-lowest"
          : "border-y border-outline-soft/40 bg-surface-low"
      }`}
      id={id}
    >
      <div className="site-container">
        <div
          className={`grid overflow-hidden rounded-editorial-xl border border-outline-soft/50 shadow-card md:grid-cols-12 ${
            isMediaAtEnd ? "bg-surface-lowest" : "bg-surface-canvas"
          }`}
        >
          {feature.image && (
            <figure
              className={`relative aspect-[8/7] overflow-hidden bg-surface-container md:col-span-6 md:aspect-auto md:min-h-[31rem] ${
                isMediaAtEnd ? "md:order-2" : "md:order-1"
              }`}
            >
              <ActivityMedia
                image={feature.image}
                sizes="(min-width: 1280px) 600px, (min-width: 768px) 50vw, calc(100vw - 40px)"
              />
            </figure>
          )}
          <div
            className={`flex flex-col justify-center p-6 md:p-10 lg:p-14 ${
              feature.image ? "md:col-span-6" : "md:col-span-12"
            } ${isMediaAtEnd ? "md:order-1" : "md:order-2"}`}
          >
            {hasEyebrow && (
              <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
                {feature.eyebrow}
              </p>
            )}
            <h2
              className="mt-2 max-w-xl font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
              id={headingId}
            >
              {hasTitle ? feature.title : fallbackLabel}
            </h2>
            {hasBody && (
              <p className="mt-5 max-w-xl whitespace-pre-line text-base leading-7 text-ink-muted md:text-body-lg">
                {feature.body}
              </p>
            )}
            <div
              aria-hidden="true"
              className="mt-8 h-0.5 w-12 bg-gold-display"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
