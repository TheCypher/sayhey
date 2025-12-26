import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavKey = "home" | "about";

type SiteNavProps = {
  current?: NavKey;
  tagline?: string;
};

const NAV_LINKS: Array<{ key: NavKey; href: string; label: string }> = [
  { key: "home", href: "/", label: "Home" },
  { key: "about", href: "/about", label: "About" },
];

export function SiteNav({
  current,
  tagline = "Voice-first journal",
}: SiteNavProps) {
  return (
    <nav
      aria-label="Primary"
      data-nav="primary"
      className="flex w-full flex-wrap items-center justify-between gap-4 rounded-3xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-5 py-4 shadow-sm shadow-black/5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-display text-2xl text-[color:var(--page-ink-strong)]">
          Hey
        </span>
        <span className="text-[0.65rem] uppercase tracking-[0.35em] text-[color:var(--page-muted)]">
          {tagline}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {NAV_LINKS.map((link) => {
          const isActive = current === link.key;
          return (
            <Link
              key={link.key}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "rounded-full px-4 text-xs uppercase tracking-[0.3em] transition-colors",
                isActive
                  ? "bg-[color:var(--page-accent)] text-[color:var(--page-ink-strong)] hover:bg-[color:var(--page-accent)]"
                  : "text-[color:var(--page-muted)] hover:bg-[color:var(--page-border)]/60 hover:text-[color:var(--page-ink-strong)]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
