type ClubBrandProps = {
  arrangement?: "compact" | "full";
  inverse?: boolean;
};

export function ClubBrand({
  arrangement = "full",
  inverse = false,
}: ClubBrandProps) {
  const primaryText = inverse ? "text-inverse-text" : "text-ink";
  const secondaryText = inverse ? "text-inverse-text/70" : "text-ink-muted";

  return (
    <span className="inline-flex min-w-0 items-center gap-3">
      {/* Original editorial mark: it is not a documented historical club crest. */}
      <svg
        aria-hidden="true"
        className="h-10 w-9 shrink-0"
        fill="none"
        viewBox="0 0 36 42"
      >
        <path
          d="M18 1.75 33 7v11.2c0 10.15-5.75 17.3-15 22.05C8.75 35.5 3 28.35 3 18.2V7L18 1.75Z"
          fill={inverse ? "#eef1f7" : "#ffffff"}
          stroke={inverse ? "#eef1f7" : "#181c20"}
          strokeWidth="2"
        />
        <path
          d="M5 8.5 18 4v33.85C9.85 33.35 5 27.15 5 18.2V8.5Z"
          fill="#d4a000"
        />
        <path
          d="M18 4 31 8.5v9.7c0 8.95-4.85 15.15-13 19.65V4Z"
          fill="#2d3135"
        />
        <path
          d="m18 10.5 2.05 4.15 4.58.67-3.32 3.23.78 4.56L18 20.95l-4.09 2.16.78-4.56-3.32-3.23 4.58-.67L18 10.5Z"
          fill="#f7f9ff"
        />
      </svg>
      <span className="min-w-0">
        <span
          className={`block truncate font-display text-sm leading-none font-bold tracking-[-0.02em] uppercase ${primaryText}`}
        >
          U.S. Albatese
        </span>
        {arrangement === "full" && (
          <span
            className={`mt-1 block text-[0.625rem] leading-4 font-semibold tracking-editorial uppercase ${secondaryText}`}
          >
            Como • Dal 1968
          </span>
        )}
      </span>
    </span>
  );
}
