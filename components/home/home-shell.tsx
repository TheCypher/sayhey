"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ConversationSidebar } from "@/components/application/conversation-sidebar";
import { HomeSpacebarCapture } from "@/components/home/home-spacebar-capture";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLocalConversations } from "@/hooks/use-local-conversations";
import { useResponsiveSidebar } from "@/hooks/use-responsive-sidebar";
import { cn } from "@/lib/utils";

const NAV_ITEMS_PUBLIC = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "Welcome", href: "/welcome" },
  { label: "About", href: "/about" },
  { label: "Login", href: "/auth" },
];
const NAV_ITEMS_AUTHENTICATED = [
  { label: "Home", href: "/" },
  { label: "Pricing", href: "/pricing" },
  { label: "Welcome", href: "/welcome" },
  { label: "About", href: "/about" },
  { label: "Account", href: "/account" },
];

const ORBIT_VARIANTS = [
  {
    name: "swoop-left-high",
    path: "M-600,600 C 200,0 1800,0 3000,900",
    width: "260vw",
    height: "180vh",
    top: "-25vh",
    left: "-70vw",
    rotate: 0,
  },
  {
    name: "swoop-left-low",
    path: "M-600,1200 C 300,1500 2000,1400 3000,700",
    width: "260vw",
    height: "200vh",
    top: "-20vh",
    left: "-70vw",
    rotate: 0,
  },
  {
    name: "swoop-right-high",
    path: "M3000,600 C 2200,0 400,0 -600,900",
    width: "260vw",
    height: "180vh",
    top: "-25vh",
    left: "-190vw",
    rotate: 0,
  },
  {
    name: "diag-left-to-right",
    path: "M-700,-400 C 400,200 2000,600 3100,1800",
    width: "280vw",
    height: "220vh",
    top: "-40vh",
    left: "-80vw",
    rotate: 0,
  },
  {
    name: "diag-right-to-left",
    path: "M3100,-400 C 2300,200 800,1200 -700,1800",
    width: "280vw",
    height: "220vh",
    top: "-40vh",
    left: "-170vw",
    rotate: 0,
  },
  {
    name: "top-down",
    path: "M1400,-800 C 800,200 1800,1600 1400,2600",
    width: "200vw",
    height: "260vh",
    top: "-80vh",
    left: "-30vw",
    rotate: 0,
  },
  {
    name: "bottom-up",
    path: "M900,2600 C 1600,1600 2000,400 700,-800",
    width: "200vw",
    height: "260vh",
    top: "-100vh",
    left: "-40vw",
    rotate: 0,
  },
] as const;

type OrbitVariant = (typeof ORBIT_VARIANTS)[number];
type OrbitDirection = "ltr" | "rtl";
type OrbitConfig = {
  variant: OrbitVariant;
  startOffset: string;
  direction: OrbitDirection;
  from: string;
  to: string;
  duration: string;
};

type HomeShellProps = {
  isAuthenticated?: boolean;
  displayName?: string | null;
};

export function HomeShell({
  isAuthenticated = false,
  displayName,
}: HomeShellProps) {
  const router = useRouter();
  const greetingName = displayName?.trim();
  const {
    conversations,
    activeConversationId,
    renameConversation,
    pinConversation,
    archiveConversation,
    deleteConversation,
    isLoading,
  } = useLocalConversations();
  const [searchTerm, setSearchTerm] = useState("");
  const { isDesktop, isSidebarOpen, closeSidebar, toggleSidebar } =
    useResponsiveSidebar({ defaultOpen: true });
  const sidebarState = isSidebarOpen ? "open" : "closed";
  const sidebarToggleLabel = isSidebarOpen ? "Close sidebar" : "Open sidebar";
  const [orbitConfig, setOrbitConfig] = useState<OrbitConfig>(() => ({
    variant: ORBIT_VARIANTS[0],
    startOffset: "0%",
    direction: "ltr",
    from: "0%",
    to: "100%",
    duration: "32s",
  }));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navItems = isAuthenticated
    ? NAV_ITEMS_AUTHENTICATED
    : NAV_ITEMS_PUBLIC;
  useEffect(() => {
    const pickInRange = (min: number, max: number) =>
      Math.random() * (max - min) + min;
    const buildConfig = (): OrbitConfig => {
      const variant =
        ORBIT_VARIANTS[Math.floor(Math.random() * ORBIT_VARIANTS.length)];
      const direction = Math.random() > 0.5 ? "ltr" : "rtl";
      const spanStart = pickInRange(-12, -4);
      const spanEnd = pickInRange(112, 135);
      const from = direction === "ltr" ? `${spanStart}%` : `${spanEnd}%`;
      const to = direction === "ltr" ? `${spanEnd}%` : `${spanStart}%`;
      const startOffset = `${Math.floor(pickInRange(40, 60))}%`;
      const durationMs = Math.floor(pickInRange(32000, 42000));
      const duration = `${Math.floor(durationMs / 1000)}s`;
      return {
        variant,
        startOffset,
        direction,
        from,
        to,
        duration,
      };
    };

    setOrbitConfig(buildConfig());
  }, []);

  const filteredConversations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return conversations;
    }
    return conversations.filter((item) => {
      const haystack = `${item.title} ${item.preview}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [conversations, searchTerm]);

  const handleOpenConversation = (conversationId: string) => {
    if (!isDesktop) {
      closeSidebar();
    }
    router.push(`/journals/${encodeURIComponent(conversationId)}`);
  };

  const handleNewConversationRequest = () => {
    if (!isDesktop) {
      closeSidebar();
    }
    router.push("/");
  };

  return (
    <div className="z-9 home-theme relative min-h-[100dvh] overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(242,182,109,0.28),_transparent_55%)]" />
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(111,176,154,0.5),_transparent_70%)] blur-3xl animate-drift" />
        <div className="absolute right-[-10rem] bottom-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(208,139,85,0.35),_transparent_70%)] blur-3xl animate-drift-slow" />
      </div>

      <div
        className="relative flex min-h-[100dvh] w-full"
        data-sidebar-state={sidebarState}
      >
        <div
          className={cn(
            "w-full h-[100dvh] md:sticky md:top-0 md:w-[280px] md:shrink-0",
            isSidebarOpen ? "block" : "hidden"
          )}
        >
          <ConversationSidebar
            conversations={filteredConversations}
            activeConversationId={activeConversationId}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onNewConversation={handleNewConversationRequest}
            onOpenConversation={handleOpenConversation}
            onRenameConversation={renameConversation}
            onPinConversation={pinConversation}
            onArchiveConversation={archiveConversation}
            onDeleteConversation={deleteConversation}
            onCloseSidebar={closeSidebar}
            isLoading={isLoading}
          />
        </div>

        <div className="relative flex flex-1 flex-col">
          <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-6 py-10 md:px-10 md:py-12">
            <nav
              data-nav="landing"
              aria-label="Primary"
              className="flex w-full items-center justify-between gap-4 rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-paper)]/85 px-4 py-3 shadow-sm shadow-black/5 backdrop-blur-sm animate-fade-up"
            >
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  data-control="sidebar-toggle"
                  aria-controls="conversation-sidebar"
                  aria-expanded={isSidebarOpen}
                  onClick={toggleSidebar}
                  className="h-9 w-9 rounded-full text-[color:var(--page-muted)] hover:bg-[color:var(--page-border)]/60 hover:text-[color:var(--page-ink-strong)]"
                >
                  {isSidebarOpen ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeftOpen className="h-4 w-4" />
                  )}
                  <span className="sr-only">{sidebarToggleLabel}</span>
                </Button>
                <Link
                  href="/journals/new"
                  className="flex items-center gap-3 font-display text-xl text-[color:var(--page-accent-strong)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-accent)] text-sm font-semibold text-white shadow-sm shadow-black/10">
                    H
                  </span>
                  Say hey
                </Link>
              </div>

              <div className="hidden items-center gap-1 lg:flex">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "sm" }),
                      "rounded-full px-3 text-[11px] uppercase tracking-[0.3em] text-[color:var(--page-muted)] hover:bg-[color:var(--page-border)]/60 hover:text-[color:var(--page-ink-strong)]"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
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
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-lg px-3 py-2 text-left text-sm text-[color:var(--page-ink)] hover:bg-[color:var(--page-border)]/60 hover:text-[color:var(--page-ink-strong)]"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <main data-page="home" className="flex flex-1 items-center">
              <div
                data-layout="home-split"
                className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-center"
              >
                <section
                  data-section="home-hero"
                  className="relative flex flex-col gap-6 text-center animate-fade-up [animation-delay:120ms] lg:text-left"
                >
                  <div
                    aria-hidden="true"
                    data-orbit="hero"
                    data-orbit-size="2xl"
                    data-orbit-visible="all"
                    data-orbit-direction={orbitConfig.direction}
                    data-orbit-variant={orbitConfig.variant.name}
                    className="pointer-events-none absolute block overflow-visible"
                    style={{
                      width: orbitConfig.variant.width,
                      height: orbitConfig.variant.height,
                      top: orbitConfig.variant.top,
                      left: orbitConfig.variant.left,
                      transform:
                        orbitConfig.variant.rotate !== 0
                          ? `rotate(${orbitConfig.variant.rotate}deg)`
                          : undefined,
                    }}
                  >
                    <div className="relative h-full w-full origin-center text-[color:var(--page-muted)] opacity-80 scale-[0.7] sm:scale-[0.82] md:scale-100">
                      <svg
                        data-animation="home-orbit"
                        viewBox="-1200 -1200 5600 4800"
                        preserveAspectRatio="none"
                        className="h-full w-full origin-left"
                      >
                        <defs>
                          <path
                            id="home-orbit-path"
                            d={orbitConfig.variant.path}
                          />
                        </defs>
                        <text
                          className="font-mono text-[18px] uppercase tracking-[0.1em] sm:text-[22px] md:text-[27px]"
                          fill="currentColor"
                        >
                          <textPath href="#home-orbit-path" startOffset={orbitConfig.startOffset}>
                            Say hey - voice-first entries - press Space to talk -
                            <animate
                              attributeName="startOffset"
                              from={orbitConfig.from}
                              to={orbitConfig.to}
                              begin="0s"
                              dur={orbitConfig.duration}
                              repeatCount="indefinite"
                            />
                          </textPath>
                        </text>
                      </svg>
                      <span className="absolute inset-3 rounded-full border border-[color:var(--page-border)] opacity-40" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    {isAuthenticated && greetingName ? (
                      <p className="mx-auto text-lg font-medium text-[color:var(--page-ink-strong)] lg:mx-0">
                        Welcome back, {greetingName}
                      </p>
                    ) : null}
                    <p className="mx-auto inline-flex items-center gap-3 rounded-full border border-[color:var(--page-border)] bg-[color:var(--page-paper)]/80 px-4 py-1 text-[11px] uppercase tracking-[0.4em] text-[color:var(--page-muted)] shadow-sm shadow-black/5 lg:mx-0">
                      <span
                        className="h-2 w-2 rounded-full bg-[color:var(--home-sage)] shadow-[0_0_12px_rgba(127,185,164,0.6)]"
                        aria-hidden="true"
                      />
                      Voice-first journal & assistant
                    </p>
                    <h1 className="font-display text-4xl leading-tight md:text-7xl">
                      <span className="text-[color:var(--page-muted)]">
                        Don't type,
                      </span>{" "}
                      <span className="bg-[linear-gradient(120deg,var(--home-sage),var(--home-ember))] bg-clip-text text-transparent">
                        just speak.
                      </span>
                    </h1>
                    <p className="mx-auto max-w-xl text-base text-[color:var(--page-muted)] md:text-lg lg:mx-0">
                      Capture your thoughts & ideas easily. Clear transcripts,
                      quiet by default, replies only when you ask.
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                    <Link
                      href="/journals/new"
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "rounded-full bg-[linear-gradient(120deg,var(--home-sage),var(--home-ember))] px-6 text-white shadow-lg shadow-black/10 transition hover:opacity-90"
                      )}
                    >
                      Start journaling
                    </Link>
                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-[color:var(--page-muted)] lg:justify-start">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[color:var(--page-border)] bg-white/70 px-3 py-1">
                        <span className="rounded-md border border-[color:var(--page-border)] bg-white px-2 py-0.5 font-mono text-[10px] uppercase text-[color:var(--page-ink-strong)]">
                          Space
                        </span>
                        Space to talk, double-tap to stop & save
                      </span>
                      <span className="rounded-full border border-[color:var(--page-border)] bg-white/70 px-3 py-1">
                        Local-only, no cloud saving.
                      </span>
                    </div>
                  </div>
                </section>

                <section
                  data-section="home-voice-card"
                  className="relative overflow-hidden rounded-[32px] border border-[color:var(--page-border)] bg-[color:var(--page-card)]/95 p-8 text-center shadow-2xl shadow-black/10 backdrop-blur animate-fade-up [animation-delay:240ms]"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(242,182,109,0.2),_transparent_60%)]" />
                  <div className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_top,_rgba(111,176,154,0.35),_transparent_70%)] blur-2xl" />
                  <div className="relative flex flex-col items-center gap-6">
                    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.4em] text-[color:var(--page-muted)]">
                      <span
                        className="h-2 w-2 rounded-full bg-[color:var(--home-sage)] shadow-[0_0_12px_rgba(127,185,164,0.6)]"
                        aria-hidden="true"
                      />
                      Live capture
                    </div>
                    <HomeSpacebarCapture />
                    <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--page-muted)]">
                      Private by design
                    </p>
                  </div>
                </section>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
