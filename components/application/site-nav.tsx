"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavKey = "welcome" | "about" | "home" | "auth" | "pricing" | "account";

type SiteNavProps = {
  current?: NavKey;
  isAuthenticated?: boolean;
  accountLabel?: string | null;
};

const NAV_LINKS_PUBLIC: Array<{ key: NavKey; href: string; label: string }> = [
  { key: "home", href: "/", label: "Home" },
  { key: "pricing", href: "/pricing", label: "Pricing" },
  { key: "welcome", href: "/welcome", label: "Welcome" },
  { key: "about", href: "/about", label: "About" },
  { key: "auth", href: "/auth", label: "Login" },
];
const NAV_LINKS_AUTHENTICATED: Array<{
  key: NavKey;
  href: string;
  label: string;
}> = [
  { key: "home", href: "/", label: "Home" },
  { key: "pricing", href: "/pricing", label: "Pricing" },
  { key: "welcome", href: "/welcome", label: "Welcome" },
  { key: "about", href: "/about", label: "About" },
];
const BRAND_HREF = "/";
const ACCOUNT_HREF = "/account";

const BRAND_STYLES = {
  "--brand-accent": "#6fb09a",
  "--brand-accent-strong": "#1d554c",
} as CSSProperties;

const getInitials = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "U";
  }
  const base = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase() || "U";
};

export function SiteNav({
  current,
  isAuthenticated = false,
  accountLabel = null,
}: SiteNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navLinks = isAuthenticated ? NAV_LINKS_AUTHENTICATED : NAV_LINKS_PUBLIC;
  const isAccountActive = current === "account";
  const accountInitials = getInitials(accountLabel ?? "User");

  const renderAccountLink = ({
    className,
    onClick,
  }: {
    className?: string;
    onClick?: () => void;
  } = {}) => (
    <Link
      href={ACCOUNT_HREF}
      data-control="account-link"
      aria-current={isAccountActive ? "page" : undefined}
      className={cn(
        buttonVariants({ variant: "ghost", size: "sm" }),
        "h-9 rounded-full border border-[color:var(--page-border)] bg-white px-2 text-[11px] text-[color:var(--page-ink-strong)] shadow-sm shadow-black/5 hover:bg-[color:var(--page-card)]",
        className
      )}
      onClick={onClick}
    >
      <span
        data-role="account-initials"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--page-accent)] text-[11px] font-semibold text-[color:var(--page-ink-strong)]"
      >
        {accountInitials}
      </span>
      <span className="sr-only">Account</span>
    </Link>
  );

  return (
    <>
      <nav
        aria-label="Primary"
        data-nav="primary"
        className="flex w-full items-center justify-between gap-4 rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-paper)]/85 px-4 py-3 shadow-sm shadow-black/5 backdrop-blur-sm animate-fade-up"
      >
        <div className="flex items-center gap-2">
          <Link
            href={BRAND_HREF}
            style={BRAND_STYLES}
            className="flex items-center gap-3 font-display text-xl text-[color:var(--brand-accent-strong)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--page-border)] bg-[color:var(--brand-accent)] text-sm font-semibold text-white shadow-sm shadow-black/10">
              H
            </span>
            Say hey
          </Link>
        </div>

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => {
            const isActive = current === link.key;
            return (
              <Link
                key={link.key}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "rounded-full px-3 text-[11px] uppercase tracking-[0.3em] text-[color:var(--page-muted)] hover:bg-[color:var(--page-border)]/60 hover:text-[color:var(--page-ink-strong)]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          {isAuthenticated && renderAccountLink()}
        </div>
        <div className="relative flex items-center gap-2 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-expanded={isMobileMenuOpen}
            className="rounded-full px-3 text-[11px] uppercase tracking-[0.3em] text-[color:var(--page-muted)] hover:bg-[color:var(--page-border)]/60 hover:text-[color:var(--page-ink-strong)]"
          >
            Menu
          </Button>
        </div>
      </nav>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[100000] lg:hidden"
          data-nav="mobile-menu"
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/10"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute right-4 top-20 w-44 rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)] p-2 shadow-lg shadow-black/15">
            {navLinks.map((link) => {
              const isActive = current === link.key;
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className="block rounded-lg px-3 py-2 text-left text-sm text-[color:var(--page-ink)] hover:bg-[color:var(--page-border)]/60 hover:text-[color:var(--page-ink-strong)]"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            {isAuthenticated && (
              <div className="px-1 py-1">
                {renderAccountLink({
                  className: "w-full justify-center",
                  onClick: () => setIsMobileMenuOpen(false),
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
