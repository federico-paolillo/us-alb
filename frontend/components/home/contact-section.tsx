import type { ContactMethodDto, LocationDto } from "@cmsjs/cms/model";

export function ContactSection({
  heading,
  introduction,
  contactMethods,
  locations,
}: {
  heading?: string;
  introduction?: string;
  contactMethods: readonly ContactMethodDto[];
  locations: readonly LocationDto[];
}) {
  const sectionHeading = heading?.trim() || "Contatti";
  const sectionIntroduction = introduction?.trim();
  const displayableLocations = locations.filter(
    (location) =>
      Boolean(location.name.trim()) ||
      Boolean(location.address.trim()) ||
      location.contactMethods.length > 0,
  );
  const isEmpty =
    contactMethods.length === 0 && displayableLocations.length === 0;

  return (
    <section
      aria-labelledby="contatti-heading"
      className="border-t border-outline-soft/50 bg-surface-lowest pt-14 pb-24 md:py-24"
      id="contatti"
    >
      <div className="site-container">
        <div className="max-w-3xl">
          <p className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-gold-deep uppercase">
            Informazioni e sedi
          </p>
          <h2
            className="mt-2 font-display text-headline-md font-semibold tracking-[-0.02em] text-ink md:text-headline-lg"
            id="contatti-heading"
          >
            {sectionHeading}
          </h2>
          {sectionIntroduction && (
            <p className="mt-4 whitespace-pre-line text-base leading-7 text-ink-muted md:text-body-lg">
              {sectionIntroduction}
            </p>
          )}
        </div>

        {contactMethods.length > 0 && (
          <ul className="mt-9 grid gap-4 md:mt-12 md:grid-cols-2 md:gap-5">
            {contactMethods.map((method, index) => (
              <li
                className="min-w-0"
                key={`${method.kind}-${method.value}-${index}`}
              >
                <ContactLink method={method} />
              </li>
            ))}
          </ul>
        )}

        {displayableLocations.length > 0 && (
          <ul className="mt-9 grid gap-5 md:mt-12 md:grid-cols-2 md:gap-7">
            {displayableLocations.map((location) => {
              const name = location.name.trim();
              const address = location.address.trim();

              return (
                <li className="min-w-0" key={location.documentId}>
                  <article className="h-full min-w-0 rounded-editorial-xl border border-outline-soft/50 bg-surface-low p-6 shadow-card md:p-8">
                    {name && (
                      <h3 className="font-display text-xl leading-7 font-semibold text-ink">
                        {name}
                      </h3>
                    )}
                    {address && (
                      <address
                        className={`whitespace-pre-line text-sm leading-6 text-ink-muted not-italic [overflow-wrap:anywhere] ${
                          name ? "mt-3" : ""
                        }`}
                      >
                        {address}
                      </address>
                    )}
                    {location.contactMethods.length > 0 && (
                      <ul
                        className={`grid gap-3 ${name || address ? "mt-6" : ""}`}
                      >
                        {location.contactMethods.map((method, index) => (
                          <li
                            className="min-w-0"
                            key={`${method.kind}-${method.value}-${index}`}
                          >
                            <ContactLink method={method} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {isEmpty && (
          <p className="mt-8 text-base leading-7 text-ink-muted">
            I contatti sono in aggiornamento.
          </p>
        )}
      </div>
    </section>
  );
}

function ContactLink({ method }: { method: ContactMethodDto }) {
  return (
    <a
      className="flex min-h-11 min-w-0 flex-col justify-center gap-1 rounded-editorial-md border border-outline-soft bg-surface-lowest px-4 py-3 text-sm transition-colors hover:border-gold-display hover:bg-gold-pale/30 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      href={method.href}
    >
      <span className="font-semibold text-ink">{method.label}</span>
      <span className="min-w-0 text-ink-muted underline decoration-outline-soft underline-offset-4 [overflow-wrap:anywhere]">
        {method.value}
      </span>
    </a>
  );
}
