"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routes = Object.freeze([
  { href: "/", label: "Home", icon: "home" },
  { href: "/chi-siamo", label: "Società", icon: "shield" },
  { href: "/attivita", label: "Attività", icon: "activity" },
  { href: "/notizie", label: "Notizie", icon: "news" },
  { href: "/#contatti", label: "Contatti", icon: "contact" },
] as const);

type Route = (typeof routes)[number];

function isActiveRoute(pathname: string | undefined, href: Route["href"]) {
  if (!pathname || href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopSiteNav() {
  return <DesktopNavigation pathname={usePathname()} />;
}

export function DesktopSiteNavFallback() {
  return <DesktopNavigation />;
}

export function MobileSiteNav() {
  return <MobileNavigation pathname={usePathname()} />;
}

export function MobileSiteNavFallback() {
  return <MobileNavigation />;
}

function DesktopNavigation({ pathname }: { pathname?: string }) {
  return (
    <nav aria-label="Principale" className="hidden md:block">
      <ul className="flex items-center gap-3 lg:gap-6">
        {routes.map(({ href, label }) => {
          const active = isActiveRoute(pathname, href);

          return (
            <li key={href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`relative block py-3 font-body text-[0.6875rem] leading-4 font-bold tracking-editorial uppercase transition-colors after:absolute after:right-0 after:bottom-1 after:left-0 after:h-0.5 after:origin-left after:bg-gold-display after:transition-transform ${
                  active
                    ? "text-ink after:scale-x-100"
                    : "text-ink-muted after:scale-x-0 hover:text-ink hover:after:scale-x-100"
                }`}
                href={href}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileNavigation({ pathname }: { pathname?: string }) {
  return (
    <nav
      aria-label="Navigazione mobile"
      className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 border-t border-outline-soft/70 bg-surface-lowest/95 shadow-[0_-8px_24px_rgb(17_19_24_/_0.06)] backdrop-blur-md md:hidden"
    >
      <ul className="grid h-16 grid-cols-5 px-1">
        {routes.map(({ href, icon, label }) => {
          const active = isActiveRoute(pathname, href);

          return (
            <li className="min-w-0" key={href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`relative flex h-16 min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 font-body text-[0.625rem] leading-3 font-semibold transition-colors before:absolute before:top-0 before:h-0.5 before:w-8 before:bg-gold-display before:transition-opacity ${
                  active
                    ? "text-ink before:opacity-100"
                    : "text-ink-muted before:opacity-0 hover:text-ink"
                }`}
                href={href}
              >
                <NavIcon name={icon} />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavIcon({ name }: { name: Route["icon"] }) {
  const paths = {
    home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3V10.5Z",
    shield: "M12 3 20 6v5.8c0 5.1-3 8.3-8 10.2-5-1.9-8-5.1-8-10.2V6l8-3Z",
    activity: "M4 17.5 8.5 13l3 3L17 8.5l3 3",
    news: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    contact: "M3 6h18v12H3zM4 7l8 6 8-6",
  } as const;
  const outlined = name === "activity" || name === "news" || name === "contact";

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill={outlined ? "none" : "currentColor"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={outlined ? 1.8 : 0}
      viewBox="0 0 24 24"
    >
      <path d={paths[name]} />
    </svg>
  );
}
