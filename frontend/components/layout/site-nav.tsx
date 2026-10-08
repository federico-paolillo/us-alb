"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routes = [
  { href: "/", label: "Home" },
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/attivita", label: "Attività" },
  { href: "/notizie", label: "Notizie" },
  { href: "/#contatti", label: "Contatti" },
] as const;

export function SiteNav() {
  return <Navigation pathname={usePathname()} />;
}

export function SiteNavFallback() {
  return <Navigation />;
}

function Navigation({ pathname }: { pathname?: string }) {
  return (
    <nav aria-label="Principale">
      <ul className="flex flex-wrap gap-x-1 gap-y-1">
        {routes.map(({ href, label }) => {
          const active =
            pathname === href ||
            (href !== "/" &&
              !href.includes("#") &&
              pathname?.startsWith(`${href}/`));

          return (
            <li key={href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`block rounded-card px-3 py-2 font-mono text-xs tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${active ? "bg-accent/15 text-accent" : "text-muted hover:text-text"}`}
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
