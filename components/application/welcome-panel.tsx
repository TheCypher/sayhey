import { cn } from "@/lib/utils";

const WELCOME_TOUR_ITEMS = [
  {
    title: "Voice capture",
    description:
      "Press Space or tap Talk to start. Pause or resume with Space; double-tap Space to stop and save.",
  },
  {
    title: "Editable notes",
    description:
      "Entries stay editable with Undo/Restore and inline attachments. AI Edit comes next.",
  },
  {
    title: "Text entry on demand",
    description:
      "Use Show text entry for typed notes or direct commands when you prefer the keyboard.",
  },
  {
    title: "Explicit replies",
    description:
      "The journal stays quiet unless you ask for a reply. Spoken playback is on by default.",
  },
  {
    title: "Local history rail",
    description:
      "Open the left sidebar to browse, pin, rename, or archive your journals.",
  },
];

const WELCOME_PHILOSOPHY_ITEMS = [
  {
    title: "Local-first privacy",
    description:
      "Transcripts stay in your browser and are encrypted at rest.",
  },
  {
    title: "Quiet by default",
    description: "No responses unless you explicitly ask for one.",
  },
  {
    title: "No right way to journal",
    description:
      "Start immediately, edit later, and shape entries into notes when you are ready.",
  },
];

type WelcomePanelProps = {
  variant?: "plain" | "card";
};

export function WelcomePanel({ variant = "plain" }: WelcomePanelProps) {
  const isCard = variant === "card";

  return (
    <div
      data-state="welcome"
      className={cn(
        "space-y-6",
        isCard &&
          "rounded-2xl border border-[color:var(--page-border)] bg-white/80 p-5 shadow-sm shadow-black/5"
      )}
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
          Welcome
        </p>
        <h3 className="font-display text-2xl text-[color:var(--page-ink-strong)]">
          Welcome to Say hey
        </h3>
        <p className="text-sm text-[color:var(--page-muted)]">
          Your voice journal and notes workspace for thinking out loud. Here is
          a quick tour and the philosophy behind it.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
            Quick tour
          </p>
          <ul className="space-y-3 text-sm text-[color:var(--page-ink-strong)]">
            {WELCOME_TOUR_ITEMS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span
                  className="mt-2 h-1.5 w-1.5 rounded-full bg-[color:var(--page-accent-strong)]"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-[color:var(--page-muted)]">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
            Our philosophy
          </p>
          <ul className="space-y-3 text-sm text-[color:var(--page-ink-strong)]">
            {WELCOME_PHILOSOPHY_ITEMS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span
                  className="mt-2 h-1.5 w-1.5 rounded-full bg-[color:var(--page-accent)]"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-xs text-[color:var(--page-muted)]">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        className={cn(
          "text-sm text-[color:var(--page-muted)]",
          isCard
            ? "rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)]/80 p-4"
            : "space-y-2"
        )}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
          Try it now
        </p>
        <p className="mt-2 text-sm text-[color:var(--page-ink-strong)]">
          Press Space or tap Talk to start your first entry. Use a direct command
          if you want a reply.
        </p>
      </div>
    </div>
  );
}
