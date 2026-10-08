const communityNetwork = ["CSI", "FIDAL", "Albate", "Famiglie", "Volontari"];

export function PartnerStrip() {
  return (
    <section
      aria-labelledby="rete-territorio-heading"
      className="bg-surface-low py-12 md:py-16"
      id="rete-territorio"
    >
      <div className="site-container text-center">
        <h2
          className="text-[0.6875rem] leading-4 font-bold tracking-editorial text-ink-muted uppercase"
          id="rete-territorio-heading"
        >
          Rete e comunità
        </h2>
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:gap-x-14">
          {communityNetwork.map((item) => (
            <li
              className="font-display text-sm font-semibold tracking-editorial text-ink-variant uppercase"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
