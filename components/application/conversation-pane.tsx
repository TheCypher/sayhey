"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlignLeft,
  ChevronDown,
  HelpCircle,
  Highlighter,
  IndentDecrease,
  IndentIncrease,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  LogOut,
  Mic,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  RotateCw,
  Sparkles,
  Strikethrough,
  User,
} from "lucide-react";

import { ConversationSidebar } from "@/components/application/conversation-sidebar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocalConversations } from "@/hooks/use-local-conversations";
import { useResponsiveSidebar } from "@/hooks/use-responsive-sidebar";
import { useTtsPlayback } from "@/hooks/use-tts-playback";
import type { TtsPlaybackItem } from "@/hooks/use-tts-playback";
import { useVoiceCapture } from "@/hooks/use-voice-capture";
import { looksLikeExplicitRequest } from "@/lib/explicit-request";
import {
  consumePendingTranscript,
  type PendingTranscript,
} from "@/lib/pending-transcript";
import type { IntentSource, Message as StoredMessage } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

type MessageRole = StoredMessage["role"];
type Message = StoredMessage;
type MessageAttachment = NonNullable<Message["attachments"]>[number];
type IntentSourceInput = {
  id: string;
  type: IntentSource["type"];
  text: string;
};
type IntentAttachmentInput = {
  id: string;
  name: string;
  dataUrl: string;
};

type IntentCitationToken =
  | { type: "text"; content: string }
  | { type: "citation"; id: string };

type IntentCitationTargets = {
  sentenceIndices: Set<number>;
  paragraphIndices: Set<number>;
  attachmentIds: Set<string>;
};

type IntentCitationState = {
  messageId: string;
  citationId: string;
};

type ConversationHistoryItem = {
  role: MessageRole;
  content: string;
};

type SendMessageArgs = {
  text: string;
  inputType: "voice" | "text";
  transcriptConfidence?: number | null;
};

type TextEntryIntent = {
  trimmed: string;
  shouldAddEntry: boolean;
  shouldRequestReply: boolean;
  notice: string | null;
};

type MicState = "idle" | "recording" | "processing" | "ready" | "error" | "paused";
type TalkTone = "waiting" | "listening" | "paused" | "processing";

type EntryIntentState = {
  status: "loading" | "ready" | "error";
  text?: string;
  sources?: IntentSource[];
  error?: string;
};

type InlineToken = {
  type: "text" | "strong" | "em" | "code";
  content: string;
};

type SentenceSegment = {
  index: number;
  displayText: string;
  speechText: string;
  isSpeakable: boolean;
};

type SentencePlaybackMeta = {
  messageId: string;
  sentenceIndex: number;
};

type EntrySnapshot = {
  messageId: string;
  content: string;
  attachments: MessageAttachment[];
};

type SpacebarShortcutTarget = EventTarget | {
  tagName?: string;
  isContentEditable?: boolean;
  dataset?: { entryEditable?: string };
  closest?: (selector: string) => Element | null;
};

type SpacebarShortcutEvent = {
  key?: string;
  code?: string;
  repeat?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  target?: SpacebarShortcutTarget | null;
};

const MIC_STATUS_COPY: Record<
  MicState,
  { label: string; helper: string }
> = {
  idle: {
    label: "Mic idle",
    helper: "Tap to capture a voice entry. Space starts.",
  },
  recording: {
    label: "Listening...",
    helper: "Tap to stop and capture. Space pauses; double-tap Space stops.",
  },
  processing: {
    label: "Processing...",
    helper: "Transcribing your voice.",
  },
  ready: {
    label: "Preparing...",
    helper: "Finalizing your entry.",
  },
  error: {
    label: "Mic error",
    helper: "Check your microphone and try again.",
  },
  paused: {
    label: "Paused",
    helper: "Tap to finish. Space resumes; double-tap Space stops.",
  },
};

const getTalkTone = (state: MicState): TalkTone => {
  switch (state) {
    case "recording":
      return "listening";
    case "paused":
      return "paused";
    case "processing":
    case "ready":
      return "processing";
    default:
      return "waiting";
  }
};

const TALK_TONE_CLASSES: Record<TalkTone, string> = {
  waiting:
    "border-[color:var(--talk-waiting-border)] bg-[color:var(--talk-waiting-bg)] text-[color:var(--talk-waiting-fg)] hover:bg-[color:var(--talk-waiting-hover)]",
  listening:
    "border-transparent bg-[color:var(--talk-listening-bg)] text-[color:var(--talk-listening-fg)] hover:bg-[color:var(--talk-listening-hover)]",
  paused:
    "border-[color:var(--talk-paused-border)] bg-[color:var(--talk-paused-bg)] text-[color:var(--talk-paused-fg)] hover:bg-[color:var(--talk-paused-hover)]",
  processing:
    "border-transparent bg-[color:var(--talk-processing-bg)] text-[color:var(--talk-processing-fg)]",
};

const TEXT_ENTRY_NOTICE = "Use a direct command if you want a reply.";
const INTENT_ERROR_MESSAGE = "Unable to summarize intent. Try again.";

const COMPOSER_PANEL_ID = "journal-composer-panel";
const ACCOUNT_MENU_ID = "journal-account-menu";

const isEditableTarget = (target: SpacebarShortcutTarget | null | undefined) => {
  if (!target) {
    return false;
  }

  const element = target as {
    tagName?: string;
    isContentEditable?: boolean;
    closest?: (selector: string) => Element | null;
  };

  if (element.isContentEditable) {
    return true;
  }

  if (element.dataset?.entryEditable === "true") {
    return true;
  }

  const tagName =
    typeof element.tagName === "string" ? element.tagName.toLowerCase() : "";
  if (tagName === "textarea" || tagName === "input" || tagName === "select") {
    return true;
  }

  if (typeof element.closest === "function") {
    const editableParent = element.closest(
      'textarea, input, select, [contenteditable="true"], [contenteditable=""], [data-entry-editable="true"]'
    );
    if (editableParent) {
      return true;
    }
  }

  return false;
};

const isSpacebarKey = (event: SpacebarShortcutEvent) =>
  event.code === "Space" || event.key === " " || event.key === "Spacebar";

const SPACEBAR_DOUBLE_TAP_MS = 280;

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

type NewJournalLandingProps = {
  greetingName: string | null;
  micState: MicState;
  talkTone: TalkTone;
  isMicBusy: boolean;
  onMicToggle: () => void;
};

const NewJournalLanding = ({
  greetingName,
  micState,
  talkTone,
  isMicBusy,
  onMicToggle,
}: NewJournalLandingProps) => {
  const [orbitConfig, setOrbitConfig] = useState<OrbitConfig>(() => ({
    variant: ORBIT_VARIANTS[0],
    startOffset: "0%",
    direction: "ltr",
    from: "0%",
    to: "100%",
    duration: "32s",
  }));

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

  const isCapturing = micState === "recording" || micState === "paused";
  const statusCopy = useMemo(() => {
    if (micState === "recording") {
      return "Listening...";
    }
    if (micState === "paused") {
      return "Paused.";
    }
    if (micState === "processing") {
      return "Transcribing...";
    }
    if (micState === "ready") {
      return "Preparing...";
    }
    if (micState === "error") {
      return "Microphone error.";
    }
    return "Ready to listen.";
  }, [micState]);
  const helperCopy = useMemo(() => {
    if (micState === "recording") {
      return "Speak your entry. Double-tap Space to stop.";
    }
    if (micState === "paused") {
      return "Press Space to resume or double-tap to stop.";
    }
    if (micState === "processing") {
      return "Sending your audio for transcription.";
    }
    if (micState === "ready") {
      return "Finalizing your entry.";
    }
    if (micState === "error") {
      return "Check mic permissions and press Space to try again.";
    }
    return "Press Space to start. Double-tap to stop & save.";
  }, [micState]);

  return (
    <div
      data-page="new-journal-landing"
      className="relative flex w-full flex-col gap-10 py-6 lg:py-10"
    >
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
            {greetingName ? (
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
              <span className="text-[color:var(--page-muted)]">Don't type,</span>{" "}
              <span className="bg-[linear-gradient(120deg,var(--home-sage),var(--home-ember))] bg-clip-text text-transparent">
                just speak.
              </span>
            </h1>
            <p className="mx-auto max-w-xl text-base text-[color:var(--page-muted)] md:text-lg lg:mx-0">
              Capture your thoughts & ideas easily. Clear transcripts, quiet by
              default, replies only when you ask.
            </p>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <button
              type="button"
              onClick={onMicToggle}
              disabled={isMicBusy}
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-full bg-[linear-gradient(120deg,var(--home-sage),var(--home-ember))] px-6 text-white shadow-lg shadow-black/10 transition hover:opacity-90"
              )}
            >
              {isCapturing ? "Stop capture" : "Start journaling"}
            </button>
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

          <p className="text-sm text-[color:var(--page-muted)] lg:text-left">
            Need a quick tour?{" "}
            <Link
              href="/welcome"
              className="font-semibold text-[color:var(--page-accent-strong)] underline underline-offset-2"
            >
              View the welcome guide.
            </Link>
          </p>
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
            <div
              data-control="home-voice-controls"
              data-state={micState}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={cn(
                    "pointer-events-none absolute h-24 w-24 rounded-full border opacity-80",
                    isCapturing
                      ? "border-[color:var(--talk-listening-bg)] opacity-90 animate-soft-pulse"
                      : "border-[color:var(--page-border)]"
                  )}
                />
                <div
                  className={cn(
                    "pointer-events-none absolute h-32 w-32 rounded-full border opacity-60 [animation-delay:1.2s]",
                    isCapturing
                      ? "border-[color:var(--talk-listening-bg)] opacity-70 animate-soft-pulse"
                      : "border-[color:var(--page-border)]"
                  )}
                />
                <Button
                  type="button"
                  size="lg"
                  variant={isCapturing ? "default" : "outline"}
                  disabled={isMicBusy}
                  onClick={onMicToggle}
                  className={cn(
                    "h-16 w-16 rounded-full border p-0 shadow-md shadow-black/10 transition disabled:opacity-100",
                    TALK_TONE_CLASSES[talkTone]
                  )}
                  aria-label={isCapturing ? "Stop recording" : "Start recording"}
                  aria-pressed={isCapturing}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
              <div className="text-xs uppercase tracking-[0.35em] text-[color:var(--page-muted)]">
                {statusCopy}
              </div>
              <p className="text-xs text-[color:var(--page-muted)]" aria-live="polite">
                {helperCopy}
              </p>
            </div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--page-muted)]">
              Private by design
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

const FOOTER_SCROLL_DELTA_PX = 8;
const FOOTER_SCROLL_EDGE_PX = 24;

type FooterScrollVisibilityArgs = {
  current: number;
  last: number;
  clientHeight: number;
  scrollHeight: number;
  deltaThreshold?: number;
  edgeThreshold?: number;
};

export const isSpacebarShortcut = (event: SpacebarShortcutEvent) => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  if (!isSpacebarKey(event)) {
    return false;
  }

  return !isEditableTarget(event.target);
};

export const getSpacebarCaptureAction = (status: MicState) => {
  if (status === "recording") {
    return "pause";
  }
  if (status === "paused") {
    return "resume";
  }
  if (status === "idle" || status === "error") {
    return "start";
  }
  return null;
};

export const getFooterVisibilityForScroll = ({
  current,
  last,
  clientHeight,
  scrollHeight,
  deltaThreshold = FOOTER_SCROLL_DELTA_PX,
  edgeThreshold = FOOTER_SCROLL_EDGE_PX,
}: FooterScrollVisibilityArgs): boolean | null => {
  const delta = current - last;
  const isNearTop = current <= edgeThreshold;
  const isNearBottom = current + clientHeight >= scrollHeight - edgeThreshold;

  if (isNearTop || isNearBottom) {
    return true;
  }

  if (Math.abs(delta) < deltaThreshold) {
    return null;
  }

  return delta < 0;
};

export const shouldStopOnSpacebarDoubleTap = (
  status: MicState,
  lastTapAt: number | null,
  now: number,
  windowMs: number = SPACEBAR_DOUBLE_TAP_MS
) => {
  if (!lastTapAt || now - lastTapAt > windowMs) {
    return false;
  }

  return status === "recording" || status === "paused";
};

export const shouldCommitEntryBlur = (
  currentTarget: HTMLElement,
  relatedTarget: Node | null,
  activeElement: Node | null
) => {
  if (relatedTarget && currentTarget.contains(relatedTarget)) {
    return false;
  }
  if (activeElement && currentTarget.contains(activeElement)) {
    return false;
  }
  return true;
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const ENTRY_ATTACHMENT_ID_ATTR = "data-entry-attachment-id";
const ENTRY_IMAGE_WRAPPER_CLASS =
  "relative inline-flex max-w-full align-middle";
const ENTRY_IMAGE_CLASS =
  "max-h-52 max-w-[320px] rounded-xl border border-[color:var(--page-border)] object-cover select-none";

export const isEntryAttachmentTarget = (
  target: EventTarget | null | undefined
) => {
  if (!target) {
    return false;
  }
  const element = target as {
    closest?: (selector: string) => Element | null;
  };
  if (typeof element.closest !== "function") {
    return false;
  }
  return Boolean(element.closest(`[${ENTRY_ATTACHMENT_ID_ATTR}]`));
};

const buildEntrySnapshot = (message: Message): EntrySnapshot => ({
  messageId: message.id,
  content: message.content,
  attachments: (message.attachments ?? []).map((attachment) => ({
    ...attachment,
  })),
});

export const getEntryRestoreSnapshot = (
  message: Message,
  snapshot: EntrySnapshot | null
): EntrySnapshot => {
  if (snapshot && snapshot.messageId === message.id) {
    return snapshot;
  }
  return buildEntrySnapshot(message);
};

const createAttachmentId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `att-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeLineBreaks = (value: string) =>
  value.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });

const buildImageAttachment = async (file: File): Promise<MessageAttachment> => {
  const dataUrl = await readFileAsDataUrl(file);
  return {
    id: createAttachmentId(),
    name: file.name || "Image",
    mimeType: file.type || "image/*",
    size: file.size,
    dataUrl,
  };
};

const getInlineAttachments = (attachments?: MessageAttachment[]) =>
  (attachments ?? []).filter(
    (attachment) =>
      attachment.mimeType.startsWith("image/") && Boolean(attachment.dataUrl)
  );

const clampAttachmentPosition = (position: number, textLength: number) =>
  Math.min(Math.max(position, 0), textLength);

const sortAttachmentsForEntry = (
  text: string,
  attachments: MessageAttachment[]
) => {
  const length = text.length;
  return attachments
    .map((attachment) => ({
      ...attachment,
      position: clampAttachmentPosition(
        attachment.position ?? length,
        length
      ),
    }))
    .sort(
      (left, right) =>
        (left.position ?? 0) - (right.position ?? 0)
    );
};

const areAttachmentsEqual = (
  left: MessageAttachment[],
  right: MessageAttachment[]
) => {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((item, index) => {
    const other = right[index];
    return (
      item.id === other.id &&
      item.name === other.name &&
      item.mimeType === other.mimeType &&
      item.size === other.size &&
      item.dataUrl === other.dataUrl &&
      item.position === other.position
    );
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeAttribute = (value: string) =>
  escapeHtml(value).replace(/"/g, "&quot;");

const ENTRY_SENTENCE_CLASS = "transition-colors duration-150";
const ENTRY_SENTENCE_ACTIVE_CLASS =
  "rounded-sm bg-[color:var(--page-accent)]/25";
const ENTRY_SENTENCE_CITATION_CLASS =
  "rounded-sm bg-[color:var(--page-accent-strong)]/20 ring-1 ring-[color:var(--page-accent-strong)]/35";
const ENTRY_ATTACHMENT_CITATION_CLASS =
  "ring-2 ring-[color:var(--page-accent-strong)]/30";
const INTENT_CITATION_PATTERN = /\[(\d+)\]/g;
const INTENT_CITATION_CLASS =
  "mx-1 h-6 inline-flex items-center rounded-full border border-[color:var(--page-border)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--page-muted)] transition-colors hover:border-[color:var(--page-accent)] hover:text-[color:var(--page-ink-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--page-accent-strong)]/40";
const INTENT_CITATION_ACTIVE_CLASS =
  "border-[color:var(--page-accent-strong)] bg-[color:var(--page-accent)]/25 text-[color:var(--page-ink-strong)]";
const ENTRY_TOOLBAR_BUTTON_CLASS =
  "h-7 gap-1.5 px-2 text-[11px] font-semibold text-[color:var(--page-ink-strong)] hover:bg-[color:var(--page-border)]/60";
const ENTRY_TOOLBAR_ICON_BUTTON_CLASS = "w-7 px-0";
const ENTRY_TOOLBAR_ICON_CLASS = "h-3.5 w-3.5";
const ENTRY_TOOLBAR_DROPDOWN_ICON_CLASS = "h-3 w-3 opacity-70";
const ENTRY_TOOLBAR_DIVIDER_CLASS = "h-5 w-px bg-[color:var(--page-border)]/80";
const ENTRY_TOOLBAR_COMING_SOON_CLASS =
  "cursor-not-allowed opacity-60 hover:bg-transparent";

const preventEntryToolbarAction = (
  event: React.MouseEvent<HTMLButtonElement>
) => {
  event.preventDefault();
};

const ENTRY_TOOLBAR_COMING_SOON_PROPS = {
  "aria-disabled": true,
  "data-state": "coming-soon",
  tabIndex: -1,
  title: "Coming soon",
  onClick: preventEntryToolbarAction,
};

type ParagraphRange = {
  index: number;
  start: number;
  end: number;
  text: string;
};

const buildParagraphRanges = (text: string): ParagraphRange[] => {
  if (!text) {
    return [];
  }
  const ranges: ParagraphRange[] = [];
  const pattern = /\n{2,}/g;
  let start = 0;
  let index = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const end = match.index;
    const slice = text.slice(start, end);
    if (slice.trim()) {
      ranges.push({ index, start, end, text: slice });
      index += 1;
    }
    start = match.index + match[0].length;
  }

  const tail = text.slice(start);
  if (tail.trim()) {
    ranges.push({ index, start, end: text.length, text: tail });
  }

  return ranges;
};

const getParagraphIndexForOffset = (
  ranges: ParagraphRange[],
  offset: number
) => {
  for (const range of ranges) {
    if (offset >= range.start && offset < range.end) {
      return range.index;
    }
  }
  return null;
};

const buildSentenceRanges = (
  text: string,
  paragraphRanges: ParagraphRange[] = []
) => {
  const ranges: Array<{
    index: number;
    start: number;
    end: number;
    paragraphIndex: number | null;
  }> = [];
  let offset = 0;
  splitIntoSentences(text).forEach((sentence, index) => {
    const start = offset;
    const end = offset + sentence.length;
    const paragraphIndex =
      paragraphRanges.length > 0
        ? getParagraphIndexForOffset(paragraphRanges, start)
        : null;
    ranges.push({ index, start, end, paragraphIndex });
    offset = end;
  });
  return ranges;
};

type EntryRenderOptions = {
  activeSentenceIndex?: number | null;
  citationTargets?: IntentCitationTargets | null;
};

const buildEntryHtml = (
  text: string,
  attachments: MessageAttachment[],
  options: EntryRenderOptions = {}
) => {
  const sorted = sortAttachmentsForEntry(text, attachments);
  const paragraphRanges = buildParagraphRanges(text);
  const sentenceRanges = buildSentenceRanges(text, paragraphRanges);
  const activeSentenceIndex =
    typeof options.activeSentenceIndex === "number"
      ? options.activeSentenceIndex
      : null;
  const citationTargets = options.citationTargets ?? null;
  let cursor = 0;
  let html = "";

  const appendTextSlice = (sliceStart: number, sliceEnd: number) => {
    if (sliceEnd <= sliceStart) {
      return;
    }
    if (sentenceRanges.length === 0) {
      html += escapeHtml(text.slice(sliceStart, sliceEnd));
      return;
    }

    sentenceRanges.forEach((range) => {
      if (range.end <= sliceStart || range.start >= sliceEnd) {
        return;
      }
      const overlapStart = Math.max(range.start, sliceStart);
      const overlapEnd = Math.min(range.end, sliceEnd);
      if (overlapEnd <= overlapStart) {
        return;
      }
      const slice = text.slice(overlapStart, overlapEnd);
      const isActive = activeSentenceIndex === range.index;
      const paragraphIndex = range.paragraphIndex;
      const isCitationActive =
        (citationTargets?.sentenceIndices.has(range.index) ?? false) ||
        (paragraphIndex !== null &&
          (citationTargets?.paragraphIndices.has(paragraphIndex) ?? false));
      const className = [
        ENTRY_SENTENCE_CLASS,
        isActive ? ENTRY_SENTENCE_ACTIVE_CLASS : "",
        isCitationActive ? ENTRY_SENTENCE_CITATION_CLASS : "",
      ]
        .filter(Boolean)
        .join(" ");
      const paragraphAttr =
        typeof paragraphIndex === "number"
          ? ` data-paragraph-index="${paragraphIndex}"`
          : "";
      html += `<span data-sentence-index="${range.index}"${paragraphAttr} data-sentence-state="${
        isActive ? "active" : "idle"
      }" class="${className}">`;
      html += escapeHtml(slice);
      html += "</span>";
    });
  };

  sorted.forEach((attachment) => {
    const position = attachment.position ?? text.length;
    appendTextSlice(cursor, position);
    const isAttachmentHighlighted =
      citationTargets?.attachmentIds.has(attachment.id) ?? false;
    const attachmentClass = [
      ENTRY_IMAGE_WRAPPER_CLASS,
      isAttachmentHighlighted ? ENTRY_ATTACHMENT_CITATION_CLASS : "",
    ]
      .filter(Boolean)
      .join(" ");
    html += `<span ${ENTRY_ATTACHMENT_ID_ATTR}="${escapeAttribute(
      attachment.id
    )}" class="${attachmentClass}" contenteditable="false" draggable="false">`;
    html += `<img src="${escapeAttribute(
      attachment.dataUrl ?? ""
    )}" alt="${escapeAttribute(
      attachment.name || "Entry image"
    )}" class="${ENTRY_IMAGE_CLASS}" draggable="false" style="-webkit-user-drag: none;" />`;
    html += "</span>";
    cursor = position;
  });

  appendTextSlice(cursor, text.length);

  return html;
};

const createAttachmentElement = (
  doc: Document,
  attachment: MessageAttachment
) => {
  const wrapper = doc.createElement("span");
  wrapper.setAttribute(ENTRY_ATTACHMENT_ID_ATTR, attachment.id);
  wrapper.className = ENTRY_IMAGE_WRAPPER_CLASS;
  wrapper.setAttribute("contenteditable", "false");
  wrapper.setAttribute("draggable", "false");

  const img = doc.createElement("img");
  img.src = attachment.dataUrl ?? "";
  img.alt = attachment.name || "Entry image";
  img.className = ENTRY_IMAGE_CLASS;
  img.draggable = false;
  img.setAttribute("draggable", "false");
  img.style.setProperty("-webkit-user-drag", "none");

  wrapper.appendChild(img);
  return wrapper;
};

const extractEntryState = (
  container: HTMLElement,
  attachmentMap: Map<string, MessageAttachment>
) => {
  const text = normalizeLineBreaks(container.innerText || "");
  const elements = Array.from(
    container.querySelectorAll(`[${ENTRY_ATTACHMENT_ID_ATTR}]`)
  );
  const attachments: MessageAttachment[] = [];

  elements.forEach((element) => {
    const id = element.getAttribute(ENTRY_ATTACHMENT_ID_ATTR);
    if (!id) {
      return;
    }
    const meta = attachmentMap.get(id);
    if (!meta) {
      return;
    }
    const range = container.ownerDocument.createRange();
    range.setStart(container, 0);
    range.setEndBefore(element);
    const position = normalizeLineBreaks(range.toString()).length;
    attachments.push({ ...meta, position });
  });

  attachments.sort(
    (left, right) =>
      (left.position ?? 0) - (right.position ?? 0)
  );

  return { text, attachments };
};

export const buildConversationHistory = (
  messages: Message[]
): ConversationHistoryItem[] =>
  messages.slice(-6).map((message) => ({
    role: message.role,
    content: message.content,
  }));

const parseInlineMarkdown = (text: string): InlineToken[] => {
  const tokens: InlineToken[] = [];
  let buffer = "";
  let index = 0;

  const flushText = () => {
    if (buffer) {
      tokens.push({ type: "text", content: buffer });
      buffer = "";
    }
  };

  while (index < text.length) {
    const char = text[index];

    if (char === "`") {
      const end = text.indexOf("`", index + 1);
      if (end !== -1) {
        flushText();
        const content = text.slice(index + 1, end);
        if (content) {
          tokens.push({ type: "code", content });
        }
        index = end + 1;
        continue;
      }
    }

    if (char === "*" && text[index + 1] === "*") {
      const end = text.indexOf("**", index + 2);
      if (end !== -1) {
        flushText();
        const content = text.slice(index + 2, end);
        if (content) {
          tokens.push({ type: "strong", content });
        }
        index = end + 2;
        continue;
      }
    }

    if (char === "*") {
      const end = text.indexOf("*", index + 1);
      if (end !== -1) {
        flushText();
        const content = text.slice(index + 1, end);
        if (content) {
          tokens.push({ type: "em", content });
        }
        index = end + 1;
        continue;
      }
    }

    buffer += char;
    index += 1;
  }

  flushText();
  return tokens;
};

const parseMarkdownBlocks = (text: string) => {
  const lines = text.split("\n");
  const blocks: Array<
    | { type: "code"; content: string }
    | { type: "list"; items: string[] }
    | { type: "paragraph"; content: string }
  > = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", content: codeLines.join("\n") });
      continue;
    }

    if (line.trim().startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      paragraphLines.push(lines[i]);
      i += 1;
    }
    const paragraph = paragraphLines.join(" ").trim();
    if (paragraph) {
      blocks.push({ type: "paragraph", content: paragraph });
    }

    while (i < lines.length && lines[i].trim() === "") {
      i += 1;
    }
  }

  return blocks;
};

const SENTENCE_PATTERN =
  /[^.!?]+[.!?]+(?:["')\]]+)?(?:\s+|$)|[^.!?]+$/g;

const splitIntoSentences = (text: string) => {
  if (!text) {
    return [];
  }
  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
    const segments = Array.from(segmenter.segment(text), (segment) => {
      return segment.segment;
    });
    if (segments.length > 0) {
      return segments;
    }
  }
  const matches = text.match(SENTENCE_PATTERN);
  return matches ?? [text];
};

const isSavedUpdatesBlock = (content: string) =>
  content.trim().toLowerCase().startsWith("saved updates:");

const buildSentenceSegments = (text: string): SentenceSegment[] => {
  const blocks = parseMarkdownBlocks(text);
  const segments: SentenceSegment[] = [];
  let index = 0;

  const pushSentence = (
    sentence: string,
    isSpeakable: boolean
  ) => {
    const speechText = sentence.trim();
    if (!speechText) {
      return;
    }
    segments.push({
      index,
      displayText: sentence,
      speechText,
      isSpeakable,
    });
    index += 1;
  };

  blocks.forEach((block) => {
    const blockSpeakable =
      block.type === "paragraph" && isSavedUpdatesBlock(block.content)
        ? false
        : true;

    if (block.type === "code") {
      pushSentence(block.content, blockSpeakable);
      return;
    }

    if (block.type === "list") {
      block.items.forEach((item) => {
        splitIntoSentences(item).forEach((sentence) => {
          pushSentence(sentence, blockSpeakable);
        });
      });
      return;
    }

    splitIntoSentences(block.content).forEach((sentence) => {
      pushSentence(sentence, blockSpeakable);
    });
  });

  return segments;
};

const buildPlainSentenceSegments = (text: string): SentenceSegment[] => {
  const segments: SentenceSegment[] = [];
  let index = 0;
  splitIntoSentences(text).forEach((sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed) {
      return;
    }
    segments.push({
      index,
      displayText: sentence,
      speechText: trimmed,
      isSpeakable: true,
    });
    index += 1;
  });
  return segments;
};

const buildIntentSources = (
  text: string,
  attachments: MessageAttachment[]
) => {
  const inputs: IntentSourceInput[] = [];
  const intentSources: IntentSource[] = [];
  const intentAttachments: IntentAttachmentInput[] = [];
  let idCounter = 1;

  splitIntoSentences(text).forEach((sentence, sentenceIndex) => {
    const trimmed = sentence.trim();
    if (!trimmed) {
      return;
    }
    const id = String(idCounter++);
    inputs.push({ id, type: "sentence", text: trimmed });
    intentSources.push({ id, type: "sentence", sentenceIndex });
  });

  const paragraphRanges = buildParagraphRanges(text);
  paragraphRanges.forEach((paragraph) => {
    const trimmed = paragraph.text.trim();
    if (!trimmed) {
      return;
    }
    const id = String(idCounter++);
    inputs.push({ id, type: "paragraph", text: trimmed });
    intentSources.push({
      id,
      type: "paragraph",
      paragraphIndex: paragraph.index,
    });
  });

  getInlineAttachments(attachments).forEach((attachment) => {
    const label = attachment.name || "Image";
    const id = String(idCounter++);
    inputs.push({ id, type: "attachment", text: label });
    intentSources.push({ id, type: "attachment", attachmentId: attachment.id });
    if (attachment.dataUrl) {
      intentAttachments.push({
        id,
        name: label,
        dataUrl: attachment.dataUrl,
      });
    }
  });

  return { inputs, intentSources, intentAttachments };
};

const renderInlineMarkdown = (text: string) =>
  parseInlineMarkdown(text).map((token, index) => {
    if (token.type === "strong") {
      return (
        <strong
          key={`strong-${index}`}
          className="font-semibold text-[color:var(--page-ink-strong)]"
        >
          {token.content}
        </strong>
      );
    }
    if (token.type === "em") {
      return (
        <em key={`em-${index}`} className="italic">
          {token.content}
        </em>
      );
    }
    if (token.type === "code") {
      return (
        <code
          key={`code-${index}`}
          className="rounded bg-[color:var(--page-ink-strong)]/10 px-1 py-0.5 font-mono text-[0.85em] text-[color:var(--page-ink-strong)]"
        >
          {token.content}
        </code>
      );
    }
    return token.content;
  });

export const renderPlainText = (text: string) => {
  const lines = text.split(/\r?\n+/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return null;
  }
  return lines.map((line, index) => (
    <p key={`plain-${index}`} className="leading-relaxed">
      {line}
    </p>
  ));
};

export const parseIntentCitations = (
  text: string,
  sources: IntentSource[] = []
): IntentCitationToken[] => {
  if (!text) {
    return [];
  }
  const knownIds = new Set(sources.map((source) => source.id));
  const tokens: IntentCitationToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  INTENT_CITATION_PATTERN.lastIndex = 0;
  while ((match = INTENT_CITATION_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }
    const id = match[1];
    if (knownIds.has(id)) {
      tokens.push({ type: "citation", id });
    } else {
      tokens.push({ type: "text", content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", content: text.slice(lastIndex) });
  }

  if (tokens.length === 0) {
    tokens.push({ type: "text", content: text });
  }

  return tokens;
};

export const getIntentCitationTargets = (
  sources: IntentSource[] = [],
  citationId?: string | null
): IntentCitationTargets | null => {
  if (!citationId) {
    return null;
  }
  const source = sources.find((item) => item.id === citationId);
  if (!source) {
    return null;
  }

  const targets: IntentCitationTargets = {
    sentenceIndices: new Set(),
    paragraphIndices: new Set(),
    attachmentIds: new Set(),
  };

  if (source.type === "sentence" && typeof source.sentenceIndex === "number") {
    targets.sentenceIndices.add(source.sentenceIndex);
    return targets;
  }
  if (
    source.type === "paragraph" &&
    typeof source.paragraphIndex === "number"
  ) {
    targets.paragraphIndices.add(source.paragraphIndex);
    return targets;
  }
  if (source.type === "attachment" && source.attachmentId) {
    targets.attachmentIds.add(source.attachmentId);
    return targets;
  }

  return null;
};

type RenderIntentTextOptions = {
  sources?: IntentSource[];
  activeCitationId?: string | null;
  lockedCitationId?: string | null;
  onCitationEnter?: (citationId: string) => void;
  onCitationLeave?: (citationId: string) => void;
  onCitationClick?: (citationId: string) => void;
};

const renderIntentText = (
  text: string,
  options: RenderIntentTextOptions = {}
) => {
  const lines = text.split(/\r?\n+/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return null;
  }
  const {
    sources = [],
    activeCitationId = null,
    lockedCitationId = null,
    onCitationEnter,
    onCitationLeave,
    onCitationClick,
  } = options;

  return lines.map((line, lineIndex) => {
    const tokens = parseIntentCitations(line, sources);
    return (
      <p key={`intent-${lineIndex}`} className="leading-relaxed">
        {tokens.map((token, tokenIndex) => {
          if (token.type !== "citation") {
            return (
              <span key={`intent-text-${lineIndex}-${tokenIndex}`}>
                {token.content}
              </span>
            );
          }
          const isActive = activeCitationId === token.id;
          const isLocked = lockedCitationId === token.id;
          return (
            <Button
              key={`intent-citation-${lineIndex}-${tokenIndex}`}
              type="button"
              variant="ghost"
              size="sm"
              data-intent-citation="true"
              data-citation-id={token.id}
              className={cn(
                INTENT_CITATION_CLASS,
                (isActive || isLocked) && INTENT_CITATION_ACTIVE_CLASS
              )}
              onMouseEnter={() => onCitationEnter?.(token.id)}
              onMouseLeave={() => onCitationLeave?.(token.id)}
              onFocus={() => onCitationEnter?.(token.id)}
              onBlur={() => onCitationLeave?.(token.id)}
              onClick={() => onCitationClick?.(token.id)}
              aria-pressed={isLocked || undefined}
              aria-label={`Highlight source ${token.id}`}
            >
              [{token.id}]
            </Button>
          );
        })}
      </p>
    );
  });
};

type RenderMarkdownOptions = {
  activeSentenceIndex?: number | null;
};

export const renderMarkdown = (
  text: string,
  options: RenderMarkdownOptions = {}
) => {
  const blocks = parseMarkdownBlocks(text);
  let sentenceIndex = 0;
  let paragraphIndex = 0;

  const renderSentences = (content: string) =>
    splitIntoSentences(content).map((sentence) => {
      const index = sentenceIndex;
      sentenceIndex += 1;
      const isActive = options.activeSentenceIndex === index;

      return (
        <span
          key={`sentence-${index}`}
          data-sentence-index={index}
          data-sentence-state={isActive ? "active" : "idle"}
          className={cn(
            "transition-colors duration-150",
            isActive && "rounded-sm bg-[color:var(--page-accent)]/25"
          )}
        >
          {renderInlineMarkdown(sentence)}
        </span>
      );
    });

  return blocks.map((block, index) => {
    if (block.type === "code") {
      const codeIndex = sentenceIndex;
      sentenceIndex += 1;
      const isActive = options.activeSentenceIndex === codeIndex;

      return (
        <pre
          key={`code-${index}`}
          data-sentence-index={codeIndex}
          data-sentence-state={isActive ? "active" : "idle"}
          className={cn(
            "overflow-x-auto rounded-xl bg-[color:var(--page-ink-strong)]/90 p-4 text-xs text-white transition-shadow duration-150",
            isActive && "shadow-[0_0_0_2px_rgba(53,90,79,0.35)]"
          )}
        >
          <code>{block.content}</code>
        </pre>
      );
    }
    if (block.type === "list") {
      return (
        <ul key={`list-${index}`} className="list-disc space-y-1 pl-5">
          {block.items.map((item, itemIndex) => (
            <li key={`item-${index}-${itemIndex}`}>
              {renderSentences(item)}
            </li>
          ))}
        </ul>
      );
    }
    const currentParagraphIndex = paragraphIndex;
    paragraphIndex += 1;
    return (
      <p
        key={`paragraph-${index}`}
        data-paragraph-index={currentParagraphIndex}
        className="leading-relaxed"
      >
        {renderSentences(block.content)}
      </p>
    );
  });
};

export { looksLikeExplicitRequest };

export const getTextEntryIntent = (text: string): TextEntryIntent => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      trimmed: "",
      shouldAddEntry: false,
      shouldRequestReply: false,
      notice: null,
    };
  }

  const shouldRequestReply = looksLikeExplicitRequest(trimmed);
  return {
    trimmed,
    shouldAddEntry: true,
    shouldRequestReply,
    notice: shouldRequestReply ? null : TEXT_ENTRY_NOTICE,
  };
};

export const normalizeVoiceTranscript = (text: string) =>
  text.replace(/\s+/g, " ").trim();

export const stripSavedUpdatesForTts = (text: string) => {
  const cleaned = text.replace(
    /\n?Saved updates:\n[\s\S]*?(\n\n|$)/gi,
    "\n\n"
  );
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
};

const buildTtsQueueItems = (
  messageId: string,
  content: string,
  options: { useMarkdown?: boolean } = {}
): TtsPlaybackItem[] => {
  const useMarkdown = options.useMarkdown !== false;
  const segments = useMarkdown
    ? buildSentenceSegments(content)
    : buildPlainSentenceSegments(content);
  return segments
    .filter((segment) => segment.isSpeakable)
    .map((segment) => ({
      id: `tts-${messageId}-${segment.index}`,
      text: segment.speechText,
      meta: {
        messageId,
        sentenceIndex: segment.index,
      } satisfies SentencePlaybackMeta,
    }));
};

const formatMessageTimestamp = (timestamp?: number | null) => {
  if (timestamp === null || timestamp === undefined) {
    return null;
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const buildPlaceholderReply = () =>
  "I ran into a problem generating a reply. Please try again in a moment.";

export const buildJournalHref = (conversationId: string) =>
  `/journals/${encodeURIComponent(conversationId)}`;

export const shouldAutoSavePendingTranscript = (
  pending: PendingTranscript | null
) => Boolean(pending?.autoSave);

type ConversationPaneProps = {
  conversationId?: string | null;
  initialView?: "home" | "history";
  displayName?: string | null;
  userEmail?: string | null;
  initialAccountMenuOpen?: boolean;
};

export function ConversationPane({
  conversationId = null,
  initialView = "history",
  displayName = null,
  userEmail = null,
  initialAccountMenuOpen = false,
}: ConversationPaneProps) {
  const routeConversationId = conversationId ?? null;
  const isHomeView = initialView === "home";
  const {
    conversations,
    activeConversationId,
    messages,
    isLoading: isHistoryLoading,
    error: historyError,
    openConversation,
    appendMessage,
    updateMessage,
    renameConversation,
    pinConversation,
    archiveConversation,
    deleteConversation,
  } = useLocalConversations({ initialConversationId: routeConversationId });
  const [searchTerm, setSearchTerm] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isComposerVisible, setIsComposerVisible] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(true);
  const [entryIntents, setEntryIntents] = useState<
    Record<string, EntryIntentState>
  >({});
  const [intentCitationHover, setIntentCitationHover] =
    useState<IntentCitationState | null>(null);
  const [intentCitationLock, setIntentCitationLock] =
    useState<IntentCitationState | null>(null);
  const [pendingTranscript, setPendingTranscript] =
    useState<PendingTranscript | null>(null);
  const [isPendingSave, setIsPendingSave] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const { isDesktop, isSidebarOpen, closeSidebar, toggleSidebar } =
    useResponsiveSidebar({
      defaultOpen: true,
    });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const entryRefMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const entrySnapshotRef = useRef<EntrySnapshot | null>(null);
  const entryAttachmentMapRef = useRef<
    Map<string, Map<string, MessageAttachment>>
  >(new Map());
  const entryToolbarPointerDownRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const lastSpacebarTapRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const handledPendingTranscriptRef = useRef(false);
  const router = useRouter();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(
    Boolean(initialAccountMenuOpen)
  );
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const greetingName = displayName?.trim() ?? "";
  const greetingEmail = userEmail?.trim() ?? "";
  const userLabel = greetingName || greetingEmail;
  const hasIdentity = Boolean(userLabel);
  const greetingInitials = getInitials(userLabel || "User");
  const activeIntentCitation = intentCitationHover ?? intentCitationLock;

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
  const isTranscriptLoading = isHistoryLoading || isRouteLoading;
  const isSavingPendingEntry =
    isPendingSave && messages.length === 0 && !pendingTranscript;
  const isHomeLanding =
    isHomeView && messages.length === 0 && !pendingTranscript && !isSavingPendingEntry;
  const shouldShowFooter = isDesktop || isComposerVisible || isFooterVisible;
  const streamContainerClassName = cn(
    "mx-auto w-full space-y-5",
    isHomeLanding
      ? "max-w-6xl px-4 py-6 md:px-6 md:py-8"
      : "max-w-3xl px-1 py-3"
  );

  const handleOpenConversation = useCallback(
    (conversationId: string) => {
      if (!isDesktop) {
        closeSidebar();
      }
      void openConversation(conversationId);
      router.push(buildJournalHref(conversationId));
    },
    [closeSidebar, isDesktop, openConversation, router]
  );

  const handleNewConversationRequest = useCallback(() => {
    if (!isDesktop) {
      closeSidebar();
    }
    router.push("/");
  }, [closeSidebar, isDesktop, router]);

  const {
    status: voiceStatus,
    transcript,
    confidence,
    error: voiceError,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    reset: resetVoice,
  } = useVoiceCapture();

  const voiceStatusRef = useRef<MicState>(voiceStatus);

  const {
    status: ttsStatus,
    queue: ttsQueue,
    currentItem: ttsCurrentItem,
    error: ttsError,
    enqueue: enqueueTts,
    clear: clearTts,
  } = useTtsPlayback();
  const hasAudioActivityNow =
    ttsQueue.length > 0 || ttsStatus !== "idle" || Boolean(ttsCurrentItem);
  const [hasAudioActivity, setHasAudioActivity] = useState(
    hasAudioActivityNow
  );

  useEffect(() => {
    if (!routeConversationId) {
      setIsRouteLoading(false);
      return;
    }
    if (isHistoryLoading) {
      return;
    }
    let active = true;
    setIsRouteLoading(true);
    void openConversation(routeConversationId).finally(() => {
      if (active) {
        setIsRouteLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [
    isHistoryLoading,
    openConversation,
    routeConversationId,
  ]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  useEffect(() => {
    if (hasAudioActivityNow) {
      setHasAudioActivity(true);
    }
  }, [hasAudioActivityNow]);

  const pushMessage = useCallback(
    (message: Message) => {
      messagesRef.current = [...messagesRef.current, message];
      return appendMessage(message);
    },
    [appendMessage]
  );

  useEffect(() => {
    if (!streamRef.current) {
      return;
    }
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!isComposerVisible) {
      return;
    }
    composerRef.current?.focus();
  }, [isComposerVisible]);

  useEffect(() => {
    if (isDesktop || isComposerVisible) {
      setIsFooterVisible(true);
      return;
    }

    const scrollTarget = containerRef.current ?? streamRef.current;
    if (!scrollTarget) {
      return;
    }

    lastScrollTopRef.current = scrollTarget.scrollTop;

    const handleScroll = () => {
      const visibility = getFooterVisibilityForScroll({
        current: scrollTarget.scrollTop,
        last: lastScrollTopRef.current,
        clientHeight: scrollTarget.clientHeight,
        scrollHeight: scrollTarget.scrollHeight,
      });

      if (visibility !== null) {
        setIsFooterVisible(visibility);
        lastScrollTopRef.current = scrollTarget.scrollTop;
      }
    };

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
    };
  }, [isComposerVisible, isDesktop]);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || accountMenuRef.current?.contains(target)) {
        return;
      }
      setIsAccountMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (typeof document !== "undefined" && !document.hasFocus()) {
        return;
      }

      if (!isSpacebarShortcut(event)) {
        return;
      }

      const now = Date.now();
      const currentStatus = voiceStatusRef.current;

      if (
        shouldStopOnSpacebarDoubleTap(
          currentStatus,
          lastSpacebarTapRef.current,
          now
        )
      ) {
        event.preventDefault();
        lastSpacebarTapRef.current = null;
        setVoiceNotice(null);
        setSendError(null);
        stopRecording();
        voiceStatusRef.current = "processing";
        return;
      }

      const action = getSpacebarCaptureAction(currentStatus);
      if (!action) {
        return;
      }

      event.preventDefault();
      setVoiceNotice(null);
      setSendError(null);
      lastSpacebarTapRef.current = now;

      if (action === "start") {
        clearTts();
        startRecording();
        voiceStatusRef.current = "recording";
        return;
      }

      if (action === "pause") {
        pauseRecording();
        voiceStatusRef.current = "paused";
        return;
      }

      if (action === "resume") {
        resumeRecording();
        voiceStatusRef.current = "recording";
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clearTts,
    pauseRecording,
    resumeRecording,
    startRecording,
    stopRecording,
  ]);

  const enqueueMessagePlayback = useCallback(
    (
      messageId: string,
      content: string,
      options: { useMarkdown?: boolean } = {}
    ) => {
      const items = buildTtsQueueItems(messageId, content, options);
      items.forEach((item) => enqueueTts(item));
    },
    [enqueueTts]
  );

  const sendMessage = useCallback(
    async ({
      text,
      inputType,
      transcriptConfidence,
    }: SendMessageArgs) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }

      clearTts();
      setSendError(null);
      setVoiceNotice(null);

      const historySource = messagesRef.current;
      const trimmedHistory = historySource.filter((message, index) => {
        const isLast = index === historySource.length - 1;
        if (!isLast) {
          return true;
        }
        return !(
          message.role === "user" && message.content.trim() === trimmed
        );
      });
      const conversationHistory = buildConversationHistory(trimmedHistory);

      try {
        const response = await fetch("/api/chat/turns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            agentId: "helper",
            inputType,
            transcriptConfidence,
            conversationHistory,
          }),
        });

        if (!response.ok) {
          throw new Error("Chat request failed");
        }

        const data = (await response.json()) as {
          assistantMessage?: string;
          fieldUpdateResults?: unknown[];
          ignored?: boolean;
        };

        if (data.ignored) {
          setVoiceNotice("Use a direct command if you want a reply.");
          return;
        }

        const assistantMessage =
          typeof data.assistantMessage === "string" &&
          data.assistantMessage.trim()
            ? data.assistantMessage
            : buildPlaceholderReply();

        const assistantId = createId();
        pushMessage({
          id: assistantId,
          role: "assistant",
          content: assistantMessage,
          createdAt: Date.now(),
        });

        enqueueMessagePlayback(assistantId, assistantMessage);
      } catch (error) {
        setSendError(
          error instanceof Error
            ? error.message
            : "Unable to generate a reply."
        );

        const fallback = buildPlaceholderReply();
        const fallbackId = createId();
        pushMessage({
          id: fallbackId,
          role: "assistant",
          content: fallback,
          createdAt: Date.now(),
        });
        enqueueMessagePlayback(fallbackId, fallback);
      }
    },
    [clearTts, enqueueMessagePlayback, pushMessage]
  );

  const saveVoiceTranscript = useCallback(
    async (trimmed: string, pendingConfidence: number | null) => {
      if (!trimmed || isPendingSave) {
        return;
      }

      setIsPendingSave(true);
      setVoiceNotice(null);
      setSendError(null);

      try {
        pushMessage({
          id: createId(),
          role: "user",
          content: trimmed,
          createdAt: Date.now(),
        });

        const isExplicit = looksLikeExplicitRequest(trimmed);
        if (!isExplicit) {
          setVoiceNotice("Use a direct command if you want a reply.");
          return;
        }

        await sendMessage({
          text: trimmed,
          inputType: "voice",
          transcriptConfidence: pendingConfidence,
        });
      } finally {
        setIsPendingSave(false);
      }
    },
    [isPendingSave, pushMessage, sendMessage]
  );

  useEffect(() => {
    if (isHistoryLoading || handledPendingTranscriptRef.current) {
      return;
    }
    handledPendingTranscriptRef.current = true;
    let active = true;

    void (async () => {
      const pending = await consumePendingTranscript();
      if (!pending || !active) {
        return;
      }

      const trimmed = normalizeVoiceTranscript(pending.transcript);
      if (!trimmed) {
        return;
      }

      const pendingConfidence =
        typeof pending.confidence === "number" ? pending.confidence : null;
      setVoiceNotice(null);
      if (shouldAutoSavePendingTranscript(pending)) {
        void saveVoiceTranscript(trimmed, pendingConfidence);
        return;
      }
      setPendingTranscript({
        transcript: trimmed,
        confidence: pendingConfidence,
      });
    })();

    return () => {
      active = false;
    };
  }, [isHistoryLoading, saveVoiceTranscript]);

  useEffect(() => {
    if (voiceStatus !== "ready" || !transcript) {
      return;
    }

    void (async () => {
      const trimmed = normalizeVoiceTranscript(transcript);
      if (!trimmed) {
        resetVoice();
        return;
      }

      setVoiceNotice(null);
      pushMessage({
        id: createId(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      });

      const isExplicit = looksLikeExplicitRequest(trimmed);

      if (!isExplicit) {
        setVoiceNotice("Use a direct command if you want a reply.");
        resetVoice();
        return;
      }

      await sendMessage({
        text: trimmed,
        inputType: "voice",
        transcriptConfidence: confidence,
      });
      resetVoice();
    })();
  }, [voiceStatus, transcript, confidence, resetVoice, sendMessage]);

  const micState: MicState = voiceStatus;
  const micCopy = MIC_STATUS_COPY[micState] ?? MIC_STATUS_COPY.idle;
  const micButtonLabel =
    micState === "recording" || micState === "paused" ? "Stop" : "Talk";
  const talkTone = getTalkTone(micState);
  const isMicBusy = micState === "processing" || micState === "ready";

  const handleComposerToggle = () => {
    setIsComposerVisible((prev) => !prev);
  };

  const handlePendingDiscard = () => {
    setPendingTranscript(null);
  };

  const handlePendingSave = async () => {
    if (!pendingTranscript || isPendingSave) {
      return;
    }
    const trimmed = pendingTranscript.transcript.trim();
    setPendingTranscript(null);
    const pendingConfidence =
      typeof pendingTranscript.confidence === "number"
        ? pendingTranscript.confidence
        : null;
    await saveVoiceTranscript(trimmed, pendingConfidence);
  };

  const handleMicClick = () => {
    if (voiceStatus === "recording" || voiceStatus === "paused") {
      setVoiceNotice(null);
      setSendError(null);
      stopRecording();
      return;
    }
    setVoiceNotice(null);
    setSendError(null);
    clearTts();
    startRecording();
  };

  const handleComposerSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    if (isSending) {
      return;
    }

    const { trimmed, shouldAddEntry, shouldRequestReply } =
      getTextEntryIntent(draft);
    if (!shouldAddEntry) {
      return;
    }

    pushMessage({
      id: createId(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    });
    setDraft("");
    setIsComposerVisible(false);

    if (!shouldRequestReply) {
      return;
    }

    setIsSending(true);
    try {
      await sendMessage({
        text: trimmed,
        inputType: "text",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleEntryPlayback = useCallback(
    (message: Message) => {
      clearTts();
      enqueueMessagePlayback(message.id, message.content, {
        useMarkdown: message.role !== "user",
      });
    },
    [clearTts, enqueueMessagePlayback]
  );

  const handleCitationEnter = useCallback(
    (messageId: string, citationId: string) => {
      setIntentCitationHover({ messageId, citationId });
    },
    []
  );

  const handleCitationLeave = useCallback(
    (messageId: string, citationId: string) => {
      setIntentCitationHover((prev) => {
        if (!prev) {
          return prev;
        }
        if (prev.messageId !== messageId || prev.citationId !== citationId) {
          return prev;
        }
        return null;
      });
    },
    []
  );

  const handleCitationClick = useCallback(
    (messageId: string, citationId: string) => {
      setIntentCitationLock((prev) => {
        if (
          prev &&
          prev.messageId === messageId &&
          prev.citationId === citationId
        ) {
          return null;
        }
        return { messageId, citationId };
      });
    },
    []
  );

  const handleEntryIntent = useCallback(
    async (message: Message) => {
      const messageId = message.id;
      const savedText =
        typeof message.intent === "string" ? message.intent.trim() : "";
      if (savedText) {
        return;
      }

      const trimmed = message.content.trim();
      const current = entryIntents[messageId];
      if (current?.status === "loading") {
        return;
      }
      if (!trimmed) {
        setEntryIntents((prev) => ({
          ...prev,
          [messageId]: { status: "error", error: INTENT_ERROR_MESSAGE },
        }));
        return;
      }

      const { inputs, intentSources, intentAttachments } = buildIntentSources(
        trimmed,
        message.attachments ?? []
      );

      setEntryIntents((prev) => ({
        ...prev,
        [messageId]: { status: "loading" },
      }));

      try {
        const response = await fetch("/api/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entry: trimmed,
            sources: inputs,
            attachments: intentAttachments,
          }),
        });

        if (!response.ok) {
          throw new Error("Intent request failed");
        }

        const data = (await response.json()) as { intent?: string };
        const intent =
          typeof data.intent === "string" ? data.intent.trim() : "";

        if (!intent) {
          throw new Error("Intent response empty");
        }

        setEntryIntents((prev) => ({
          ...prev,
          [messageId]: {
            status: "ready",
            text: intent,
            sources: intentSources,
          },
        }));
      } catch {
        setEntryIntents((prev) => ({
          ...prev,
          [messageId]: {
            status: "error",
            error: INTENT_ERROR_MESSAGE,
          },
        }));
      }
    },
    [entryIntents]
  );

  const handleIntentSave = useCallback(
    async (messageId: string) => {
      const current = entryIntents[messageId];
      if (!current || current.status !== "ready") {
        return;
      }
      const trimmed = current.text?.trim();
      if (!trimmed) {
        return;
      }

      const updated = await updateMessage(messageId, {
        intent: trimmed,
        intentSources:
          current.sources && current.sources.length > 0
            ? current.sources
            : undefined,
      });
      if (!updated) {
        return;
      }

      setEntryIntents((prev) => {
        if (!prev[messageId]) {
          return prev;
        }
        const { [messageId]: _removed, ...rest } = prev;
        return rest;
      });
    },
    [entryIntents, updateMessage]
  );

  const handleIntentDelete = useCallback(
    async (messageId: string) => {
      const updated = await updateMessage(messageId, {
        intent: null,
        intentSources: undefined,
      });
      if (!updated) {
        return;
      }

      setEntryIntents((prev) => {
        if (!prev[messageId]) {
          return prev;
        }
        const { [messageId]: _removed, ...rest } = prev;
        return rest;
      });
      setIntentCitationHover((prev) =>
        prev?.messageId === messageId ? null : prev
      );
      setIntentCitationLock((prev) =>
        prev?.messageId === messageId ? null : prev
      );
    },
    [updateMessage]
  );

  const setEntryRef = useCallback(
    (messageId: string) => (node: HTMLDivElement | null) => {
      if (node) {
        entryRefMap.current.set(messageId, node);
        return;
      }
      entryRefMap.current.delete(messageId);
    },
    []
  );

  const getEntryAttachmentMap = useCallback((message: Message) => {
    const existing = entryAttachmentMapRef.current.get(message.id);
    if (existing) {
      return existing;
    }
    const map = new Map<string, MessageAttachment>();
    (message.attachments ?? []).forEach((attachment) => {
      map.set(attachment.id, attachment);
    });
    entryAttachmentMapRef.current.set(message.id, map);
    return map;
  }, []);

  const handleEntryFocus = useCallback(
    (message: Message) => {
      if (message.role !== "user") {
        return;
      }
      setActiveEntryId(message.id);
      if (
        !entrySnapshotRef.current ||
        entrySnapshotRef.current.messageId !== message.id
      ) {
        entrySnapshotRef.current = buildEntrySnapshot(message);
      }
      getEntryAttachmentMap(message);
    },
    [getEntryAttachmentMap]
  );

  const saveEntryFromDom = useCallback(
    async (message: Message) => {
      if (message.role !== "user") {
        return;
      }
      const entry = entryRefMap.current.get(message.id);
      if (!entry) {
        return;
      }
      const attachmentMap =
        entryAttachmentMapRef.current.get(message.id) ?? new Map();
      const { text, attachments } = extractEntryState(entry, attachmentMap);
      const nextText = normalizeLineBreaks(text);
      const nextAttachments = getInlineAttachments(attachments);
      const currentAttachments = getInlineAttachments(message.attachments);
      const sortedNextAttachments = sortAttachmentsForEntry(
        nextText,
        nextAttachments
      );
      const sortedCurrentAttachments = sortAttachmentsForEntry(
        message.content,
        currentAttachments
      );
      const hasContentChanged = nextText !== message.content;
      const hasAttachmentChanges = !areAttachmentsEqual(
        sortedCurrentAttachments,
        sortedNextAttachments
      );

      if (!hasContentChanged && !hasAttachmentChanges) {
        return;
      }

      const updates: Partial<
        Pick<Message, "content" | "attachments" | "intent" | "intentSources">
      > = {
        content: nextText,
        attachments:
          sortedNextAttachments.length > 0
            ? sortedNextAttachments
            : undefined,
      };
      if (hasContentChanged) {
        updates.intent = null;
        updates.intentSources = undefined;
      }

      const updated = await updateMessage(message.id, updates);
      if (!updated) {
        return;
      }

      setEntryIntents((prev) => {
        if (!prev[message.id]) {
          return prev;
        }
        const { [message.id]: _, ...rest } = prev;
        return rest;
      });
    },
    [updateMessage]
  );

  const handleEntryBlur = useCallback(
    async (message: Message, event: React.FocusEvent<HTMLDivElement>) => {
      if (message.role !== "user") {
        return;
      }
      if (entryToolbarPointerDownRef.current) {
        entryToolbarPointerDownRef.current = false;
        return;
      }
      const currentTarget = event.currentTarget;
      const nextTarget = event.relatedTarget as Node | null;
      const activeElement = currentTarget.ownerDocument.activeElement;
      if (!shouldCommitEntryBlur(currentTarget, nextTarget, activeElement)) {
        return;
      }
      await saveEntryFromDom(message);
      setActiveEntryId((prev) => (prev === message.id ? null : prev));
      entrySnapshotRef.current = null;
      entryAttachmentMapRef.current.delete(message.id);
    },
    [saveEntryFromDom]
  );

  const handleEntryToolbarPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      entryToolbarPointerDownRef.current = true;
      event.preventDefault();
      setTimeout(() => {
        entryToolbarPointerDownRef.current = false;
      }, 0);
    },
    []
  );

  const handleEntryUndo = useCallback((messageId: string) => {
    if (typeof document === "undefined") {
      return;
    }
    const entry = entryRefMap.current.get(messageId);
    if (!entry) {
      return;
    }
    entry.focus();
    document.execCommand("undo");
  }, []);

  const handleEntryRestore = useCallback((message: Message) => {
    const entry = entryRefMap.current.get(message.id);
    if (!entry) {
      return;
    }
    const snapshot = getEntryRestoreSnapshot(
      message,
      entrySnapshotRef.current
    );
    entrySnapshotRef.current = snapshot;
    entry.innerHTML = buildEntryHtml(
      snapshot.content,
      getInlineAttachments(snapshot.attachments)
    );
    const map = new Map<string, MessageAttachment>();
    snapshot.attachments.forEach((attachment) => {
      map.set(attachment.id, attachment);
    });
    entryAttachmentMapRef.current.set(message.id, map);
    entry.focus();
  }, []);

  const handleEntryDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const items = Array.from(event.dataTransfer?.items ?? []);
      const hasImage = items.some(
        (item) => item.kind === "file" && item.type.startsWith("image/")
      );
      if (!hasImage) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    []
  );

  const handleEntryDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (isEntryAttachmentTarget(event.target)) {
        event.stopPropagation();
      }
      event.preventDefault();
    },
    []
  );

  const handleEntryDrop = useCallback(
    async (message: Message, event: React.DragEvent<HTMLDivElement>) => {
      if (message.role !== "user") {
        return;
      }
      const files = Array.from(event.dataTransfer?.files ?? []);
      const imageFiles = files.filter((file) =>
        file.type.startsWith("image/")
      );
      if (imageFiles.length === 0) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const entry = entryRefMap.current.get(message.id);
      if (!entry) {
        return;
      }

      handleEntryFocus(message);

      const selection = window.getSelection();
      let range: Range | null = null;
      const { clientX, clientY } = event;
      if (typeof document.caretRangeFromPoint === "function") {
        range = document.caretRangeFromPoint(clientX, clientY);
      } else if (typeof document.caretPositionFromPoint === "function") {
        const position = document.caretPositionFromPoint(clientX, clientY);
        if (position) {
          range = document.createRange();
          range.setStart(position.offsetNode, position.offset);
          range.collapse(true);
        }
      } else if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
      }

      if (!range) {
        return;
      }

      if (!entry.contains(range.startContainer)) {
        range = document.createRange();
        range.selectNodeContents(entry);
        range.collapse(false);
      }

      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);

      const attachmentMap = getEntryAttachmentMap(message);

      for (const file of imageFiles) {
        try {
          const attachment = await buildImageAttachment(file);
          attachmentMap.set(attachment.id, attachment);
          const element = createAttachmentElement(
            entry.ownerDocument,
            attachment
          );
          range.insertNode(element);
          const spacer = entry.ownerDocument.createTextNode("");
          element.after(spacer);
          range.setStart(spacer, 0);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch (error) {
          setSendError(
            error instanceof Error ? error.message : "Unable to add image."
          );
        }
      }
    },
    [getEntryAttachmentMap, handleEntryFocus]
  );

  const queuedMessageCount = useMemo(() => {
    if (ttsQueue.length === 0) {
      return 0;
    }
    const ids = new Set<string>();
    ttsQueue.forEach((item) => {
      const meta = item.meta as SentencePlaybackMeta | undefined;
      if (meta?.messageId) {
        ids.add(meta.messageId);
      }
    });
    return ids.size || ttsQueue.length;
  }, [ttsQueue]);

  const audioQueueLabel = useMemo(() => {
    if (queuedMessageCount === 0) {
      return "No queued audio";
    }
    if (queuedMessageCount === 1) {
      return "1 reply queued";
    }
    return `${queuedMessageCount} replies queued`;
  }, [queuedMessageCount]);
  const activeSentence = useMemo(() => {
    if (ttsStatus !== "playing" && ttsStatus !== "loading") {
      return null;
    }
    const meta = ttsCurrentItem?.meta as SentencePlaybackMeta | undefined;
    if (!meta) {
      return null;
    }
    if (
      typeof meta.messageId !== "string" ||
      typeof meta.sentenceIndex !== "number"
    ) {
      return null;
    }
    return {
      messageId: meta.messageId,
      sentenceIndex: meta.sentenceIndex,
    };
  }, [ttsCurrentItem, ttsStatus]);
  const sidebarState = isSidebarOpen ? "open" : "closed";
  const sidebarToggleLabel = isSidebarOpen ? "Close sidebar" : "Open sidebar";
  const accountMenuLabel = isAccountMenuOpen
    ? "Close account menu"
    : "Open account menu";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-[100dvh] overflow-x-hidden overflow-y-auto text-[color:var(--page-ink)] md:overflow-hidden",
        isHomeView ? "bg-[color:var(--page-bg)]" : "bg-white"
      )}
      data-pane="conversation"
    >
      {isHomeView && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(242,182,109,0.28),_transparent_55%)]" />
          <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(111,176,154,0.5),_transparent_70%)] blur-3xl animate-drift" />
          <div className="absolute right-[-10rem] bottom-[-8rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(208,139,85,0.35),_transparent_70%)] blur-3xl animate-drift-slow" />
        </div>
      )}
      <div
        className="relative flex min-h-full w-full flex-col md:h-full md:flex-row"
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
            isLoading={isHistoryLoading}
          />
        </div>

        <main
          className={cn(
            "flex min-h-[100dvh] flex-1 flex-col px-4 py-2 md:min-h-0 md:overflow-hidden md:px-6 md:py-2",
            isHomeView ? "bg-[color:var(--page-bg)]" : "bg-white"
          )}
          data-layout="journal-canvas"
        >
          <div className="flex w-full flex-1 min-h-0 flex-col gap-2 md:mx-auto">
            <nav
              data-nav="journal"
              aria-label="Journal"
              className={cn(
                "sticky top-0 z-20 w-full border-b border-[color:var(--page-border)] backdrop-blur",
                isHomeView ? "bg-[color:var(--page-bg)]" : "bg-white/95"
              )}
            >
              <div className="w-full px-2 py-1">
                <div
                  data-location="journal-header"
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 md:gap-3"
                >
                  <div
                    data-role="journal-left"
                    className="flex min-w-0 items-center gap-2 col-start-1 row-start-1"
                  >
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
                    <span
                      data-role="journal-title"
                      className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--page-muted)]"
                    >
                      JOURNAL
                    </span>
                  </div>
                  <div
                    data-role="journal-center"
                    className="flex min-w-0 items-center justify-center col-span-3 row-start-2 md:col-span-1 md:row-start-1 md:col-start-2"
                  >
                    <div className="w-full md:overflow-x-auto">
                      <div
                        data-location="journal-topbar"
                        className="mx-auto flex w-full min-w-0 flex-wrap items-center justify-center gap-3 whitespace-normal md:min-w-fit md:flex-nowrap md:gap-4 md:whitespace-nowrap"
                      >
                        <div
                          data-pane="voice-controls"
                          className="flex min-w-0 flex-wrap items-center gap-2"
                        >
                          <Button
                            data-control="mic"
                            className={cn(
                              "h-10 w-10 rounded-full border text-[11px] font-semibold transition-colors disabled:opacity-100",
                              TALK_TONE_CLASSES[talkTone]
                            )}
                            onClick={handleMicClick}
                            aria-pressed={
                              voiceStatus === "recording" ||
                              voiceStatus === "paused"
                            }
                            disabled={
                              voiceStatus === "processing" ||
                              voiceStatus === "ready"
                            }
                          >
                            {micButtonLabel}
                          </Button>
                          {!isComposerVisible && (
                            <div
                              data-role="journal-shortcuts"
                              className="hidden min-w-0 flex-wrap items-center gap-1 text-[11px] leading-snug text-[color:var(--page-muted)] md:flex md:flex-nowrap md:whitespace-nowrap"
                            >
                              <span className="min-w-0 font-semibold">
                                <strong className="font-semibold text-[color:var(--page-accent-strong)]">
                                  Spacebar
                                </strong>{" "}
                                - press{" "}
                                <strong className="font-semibold text-[color:var(--page-accent-strong)]">
                                  Space
                                </strong>{" "}
                                to start, pause, or resume; double-tap{" "}
                                <strong className="font-semibold text-[color:var(--page-accent-strong)]">
                                  Space
                                </strong>{" "}
                                to stop and send, or use
                              </span>
                              <button
                                type="button"
                                className="p-0 text-[11px] font-normal text-[color:var(--page-accent-strong)] hover:text-[color:var(--page-ink-strong)]"
                                data-control="composer-toggle"
                                aria-controls={COMPOSER_PANEL_ID}
                                aria-expanded={isComposerVisible}
                                onClick={handleComposerToggle}
                              >
                                <strong className="font-semibold">
                                  Show text entry
                                </strong>
                              </button>
                            </div>
                          )}
                        </div>
                        {hasAudioActivity && (
                          <>
                            <span className="text-[11px] text-[color:var(--page-muted)]">
                              {audioQueueLabel}
                            </span>
                            <Button
                              data-control="stop-audio"
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={clearTts}
                              disabled={
                                ttsStatus === "idle" && ttsQueue.length === 0
                              }
                            >
                              Stop audio
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    data-role="journal-right"
                    className="flex items-center justify-end gap-3 col-start-3 row-start-1"
                  >
                    {hasIdentity && (
                      <span
                        data-role="journal-user"
                        className="min-w-0 truncate text-sm font-semibold text-[color:var(--page-ink-strong)]"
                      >
                        {userLabel}
                      </span>
                    )}
                    {hasIdentity && (
                      <div
                        ref={accountMenuRef}
                        data-menu="account"
                        className="relative"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          data-control="account-menu"
                          aria-haspopup="menu"
                          aria-expanded={isAccountMenuOpen}
                          aria-controls={ACCOUNT_MENU_ID}
                          onClick={() =>
                            setIsAccountMenuOpen((prev) => !prev)
                          }
                          className="h-9 rounded-full border border-[color:var(--page-border)] bg-white px-2 text-[11px] text-[color:var(--page-ink-strong)] shadow-sm shadow-black/5 hover:bg-[color:var(--page-card)]"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--page-accent)] text-[11px] font-semibold text-[color:var(--page-ink-strong)]">
                            {greetingInitials}
                          </span>
                          <MoreHorizontal className="h-4 w-4 text-[color:var(--page-muted)]" />
                          <span className="sr-only">{accountMenuLabel}</span>
                        </Button>
                        {isAccountMenuOpen && (
                          <div
                            id={ACCOUNT_MENU_ID}
                            role="menu"
                            className="absolute right-0 top-full z-30 mt-2 w-48 rounded-2xl border border-[color:var(--page-border)] bg-white p-1 shadow-lg shadow-black/10"
                          >
                            <div className="px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--page-muted)]">
                                Signed in
                              </p>
                              <p className="truncate text-sm font-semibold text-[color:var(--page-ink-strong)]">
                                {userLabel}
                              </p>
                            </div>
                            <div className="h-px bg-[color:var(--page-border)]/80" />
                            <Link
                              href="/welcome"
                              role="menuitem"
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "sm" }),
                                "h-9 w-full justify-start gap-2 px-3 text-xs text-[color:var(--page-ink)] hover:bg-[color:var(--page-card)]"
                              )}
                              onClick={() => setIsAccountMenuOpen(false)}
                            >
                              <HelpCircle className="h-4 w-4" />
                              Welcome
                            </Link>
                            <Link
                              href="/account"
                              role="menuitem"
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "sm" }),
                                "h-9 w-full justify-start gap-2 px-3 text-xs text-[color:var(--page-ink)] hover:bg-[color:var(--page-card)]"
                              )}
                              onClick={() => setIsAccountMenuOpen(false)}
                            >
                              <User className="h-4 w-4" />
                              Account
                            </Link>
                            <Link
                              href="/auth/logout"
                              role="menuitem"
                              prefetch={false}
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "sm" }),
                                "h-9 w-full justify-start gap-2 px-3 text-xs text-[color:var(--page-ink)] hover:bg-[color:var(--page-card)]"
                              )}
                              onClick={() => setIsAccountMenuOpen(false)}
                            >
                              <LogOut className="h-4 w-4" />
                              Logout
                            </Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </nav>

            {(voiceStatus === "processing" ||
              voiceStatus === "ready" ||
              ttsError ||
              voiceError ||
              voiceNotice ||
              sendError ||
              historyError) && (
              <div className="mx-auto w-full max-w-3xl space-y-1 px-1 py-2">
                {voiceStatus === "processing" && (
                  <p className="text-sm text-[color:var(--page-muted)]">
                    Transcribing your entry...
                  </p>
                )}
                {voiceStatus === "ready" && (
                  <p className="text-sm text-[color:var(--page-muted)]">
                    Preparing your entry...
                  </p>
                )}
                {ttsError && (
                  <p className="text-sm text-red-700">{ttsError}</p>
                )}
                {voiceError && (
                  <p className="text-sm text-red-700">{voiceError}</p>
                )}
                {voiceNotice && (
                  <p className="text-sm text-amber-700">{voiceNotice}</p>
                )}
                {sendError && (
                  <p className="text-sm text-red-700">{sendError}</p>
                )}
                {historyError && (
                  <p className="text-sm text-red-700">{historyError}</p>
                )}
              </div>
            )}

            <section
              data-pane="journal-entries"
              data-size="page"
              data-layout="journal-canvas"
              className="flex min-h-[60dvh] flex-1 flex-col md:min-h-0"
            >
              <div
                ref={streamRef}
                data-stream="messages"
                data-scroll="journal-entries"
                className="flex-1 overflow-y-auto"
              >
                <div className={streamContainerClassName}>
                  {isTranscriptLoading ? (
                    <div className="text-sm text-[color:var(--page-muted)]">
                      Loading your journal history...
                    </div>
                  ) : pendingTranscript ? (
                    <div
                      data-state="pending-transcript"
                      className="space-y-4 rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-card)] p-5 text-[color:var(--page-ink-strong)] shadow-sm shadow-black/5"
                    >
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                          Review
                        </p>
                        <h3 className="font-display text-2xl">
                          Save this transcription?
                        </h3>
                        <p className="text-xs text-[color:var(--page-muted)]">
                          Your entry will be saved locally and added to this journal.
                        </p>
                      </div>
                      <div className="rounded-xl border border-[color:var(--page-border)] bg-white/80 p-4 text-sm leading-relaxed">
                        {renderPlainText(pendingTranscript.transcript)}
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handlePendingDiscard}
                        >
                          Discard
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handlePendingSave}
                          disabled={isPendingSave}
                        >
                          {isPendingSave ? "Saving..." : "Save entry"}
                        </Button>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    isSavingPendingEntry ? (
                      <div className="text-sm text-[color:var(--page-muted)]">
                        Saving your entry...
                      </div>
                    ) : isHomeLanding ? (
                      <NewJournalLanding
                        greetingName={greetingName || null}
                        micState={micState}
                        talkTone={talkTone}
                        isMicBusy={isMicBusy}
                        onMicToggle={handleMicClick}
                      />
                    ) : (
                      <div className="space-y-2 text-sm text-[color:var(--page-muted)]">
                        <p>Say your entry to get started.</p>
                        <p>
                          Need a quick tour?{" "}
                          <Link
                            href="/welcome"
                            className="font-semibold text-[color:var(--page-accent-strong)] underline underline-offset-2"
                          >
                            View the welcome guide.
                          </Link>
                        </p>
                      </div>
                    )
                  ) : (
                    messages.map((message) => {
                      const timestamp = formatMessageTimestamp(message.createdAt);
                      const activeSentenceIndex =
                        activeSentence?.messageId === message.id
                          ? activeSentence.sentenceIndex
                          : null;
                      const savedIntent =
                        message.role === "user" &&
                        typeof message.intent === "string"
                          ? message.intent.trim()
                          : "";
                      const intentState =
                        message.role === "user"
                          ? entryIntents[message.id]
                          : undefined;
                      const intentStatus = savedIntent
                        ? "ready"
                        : intentState?.status;
                      const intentText =
                        savedIntent || intentState?.text || "";
                      const intentSources =
                        message.role === "user"
                          ? message.intentSources ?? intentState?.sources ?? []
                          : [];
                      const lockedCitationId =
                        intentCitationLock?.messageId === message.id
                          ? intentCitationLock.citationId
                          : null;
                      const activeCitationId =
                        activeIntentCitation?.messageId === message.id
                          ? activeIntentCitation.citationId
                          : null;
                      const citationTargets = activeCitationId
                        ? getIntentCitationTargets(
                            intentSources,
                            activeCitationId
                          )
                        : null;
                      const shouldShowIntent =
                        Boolean(savedIntent) || Boolean(intentState);
                      const isIntentSaved = Boolean(savedIntent);
                      const isEditable = message.role === "user";
                      const isActiveEntry = activeEntryId === message.id;
                      const entryAttachments = getInlineAttachments(
                        message.attachments
                      );
                      const entryHtml = isEditable
                        ? buildEntryHtml(message.content, entryAttachments, {
                            activeSentenceIndex: isActiveEntry
                              ? null
                              : activeSentenceIndex,
                            citationTargets,
                          })
                        : "";

                      return (
                        <div
                          key={message.id}
                          data-entry-id={message.id}
                          data-entry-role={message.role}
                          className="space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--page-muted)]">
                              {message.role === "user" ? "Entry" : "Reply"}
                            </span>
                            {timestamp && (
                              <span
                                className="text-[11px] font-semibold text-[color:var(--page-ink-strong)]"
                                data-role="timestamp"
                                data-timestamp={message.createdAt}
                              >
                                {timestamp}
                              </span>
                            )}
                          </div>
                          <div
                            className="space-y-2"
                            onFocus={
                              isEditable ? () => handleEntryFocus(message) : undefined
                            }
                            onBlur={
                              isEditable
                                ? (event) => void handleEntryBlur(message, event)
                                : undefined
                            }
                          >
                            {isEditable && (
                              <div
                                data-role="entry-toolbar"
                                data-variant="editor-toolbar"
                                data-state={isActiveEntry ? "active" : "idle"}
                                className={cn(
                                  "flex w-full flex-wrap items-center gap-1 rounded-sm border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-2 text-[11px] text-[color:var(--page-muted)] shadow-sm shadow-black/5 transition-all duration-150",
                                  isActiveEntry
                                    ? "py-1 opacity-100"
                                    : "max-h-0 overflow-hidden border-transparent py-0 opacity-0 pointer-events-none"
                                )}
                                aria-hidden={!isActiveEntry}
                                onPointerDown={handleEntryToolbarPointerDown}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-undo"
                                  title="Undo"
                                  aria-label="Undo"
                                  className={ENTRY_TOOLBAR_BUTTON_CLASS}
                                  onClick={() => handleEntryUndo(message.id)}
                                  disabled={!isActiveEntry}
                                >
                                  <RotateCcw className={ENTRY_TOOLBAR_ICON_CLASS} />
                                  <span>Undo</span>
                                </Button>
                                <span
                                  aria-hidden="true"
                                  className={ENTRY_TOOLBAR_DIVIDER_CLASS}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-restore"
                                  title="Restore"
                                  aria-label="Restore"
                                  className={ENTRY_TOOLBAR_BUTTON_CLASS}
                                  onClick={() => handleEntryRestore(message)}
                                  disabled={!isActiveEntry}
                                >
                                  <RotateCw className={ENTRY_TOOLBAR_ICON_CLASS} />
                                  <span>Restore</span>
                                </Button>
                                <span
                                  aria-hidden="true"
                                  className={ENTRY_TOOLBAR_DIVIDER_CLASS}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-ai-edit"
                                  aria-label="AI Edit"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <Sparkles
                                    className={cn(
                                      ENTRY_TOOLBAR_ICON_CLASS,
                                      "text-[color:var(--page-accent-strong)]"
                                    )}
                                  />
                                  <span>AI Edit</span>
                                  <ChevronDown
                                    className={ENTRY_TOOLBAR_DROPDOWN_ICON_CLASS}
                                  />
                                </Button>
                                <span
                                  aria-hidden="true"
                                  className={ENTRY_TOOLBAR_DIVIDER_CLASS}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-text-style"
                                  aria-label="Text style"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <span className="font-semibold">Aa</span>
                                  <ChevronDown
                                    className={ENTRY_TOOLBAR_DROPDOWN_ICON_CLASS}
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-font-family"
                                  aria-label="Font family"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <span className="whitespace-nowrap">
                                    Sans Serif
                                  </span>
                                  <ChevronDown
                                    className={ENTRY_TOOLBAR_DROPDOWN_ICON_CLASS}
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-font-size"
                                  aria-label="Font size"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <span>15</span>
                                  <ChevronDown
                                    className={ENTRY_TOOLBAR_DROPDOWN_ICON_CLASS}
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-text-color"
                                  aria-label="Text color"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <span
                                    aria-hidden="true"
                                    className="h-3.5 w-3.5 rounded-full border border-[color:var(--page-border)] bg-gradient-to-br from-amber-300 via-rose-400 to-sky-400"
                                  />
                                  <ChevronDown
                                    className={ENTRY_TOOLBAR_DROPDOWN_ICON_CLASS}
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-bold"
                                  aria-label="Bold"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <span className="text-[11px] font-semibold">
                                    B
                                  </span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-italic"
                                  aria-label="Italic"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <span className="text-[11px] italic">I</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-underline"
                                  aria-label="Underline"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <span className="text-[11px] underline">U</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-highlight"
                                  aria-label="Highlight"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <Highlighter className={ENTRY_TOOLBAR_ICON_CLASS} />
                                </Button>
                                <span
                                  aria-hidden="true"
                                  className={ENTRY_TOOLBAR_DIVIDER_CLASS}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-list-bulleted"
                                  aria-label="Bulleted list"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <List className={ENTRY_TOOLBAR_ICON_CLASS} />
                                  <ChevronDown
                                    className={ENTRY_TOOLBAR_DROPDOWN_ICON_CLASS}
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-list-numbered"
                                  aria-label="Numbered list"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <ListOrdered className={ENTRY_TOOLBAR_ICON_CLASS} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-list-check"
                                  aria-label="Checklist"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <ListChecks className={ENTRY_TOOLBAR_ICON_CLASS} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-link"
                                  aria-label="Insert link"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <Link2 className={ENTRY_TOOLBAR_ICON_CLASS} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-align"
                                  aria-label="Alignment"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <AlignLeft className={ENTRY_TOOLBAR_ICON_CLASS} />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-indent-increase"
                                  aria-label="Increase indent"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <IndentIncrease
                                    className={ENTRY_TOOLBAR_ICON_CLASS}
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-indent-decrease"
                                  aria-label="Decrease indent"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <IndentDecrease
                                    className={ENTRY_TOOLBAR_ICON_CLASS}
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-strikethrough"
                                  aria-label="Strikethrough"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <Strikethrough
                                    className={ENTRY_TOOLBAR_ICON_CLASS}
                                  />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-superscript"
                                  aria-label="Superscript"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <span className="text-[11px] font-semibold">
                                    x^2
                                  </span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-subscript"
                                  aria-label="Subscript"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_ICON_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <span className="text-[11px] font-semibold">
                                    x_2
                                  </span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  data-control="entry-more"
                                  aria-label="More"
                                  className={cn(
                                    ENTRY_TOOLBAR_BUTTON_CLASS,
                                    ENTRY_TOOLBAR_COMING_SOON_CLASS
                                  )}
                                  {...ENTRY_TOOLBAR_COMING_SOON_PROPS}
                                >
                                  <span>More</span>
                                  <ChevronDown
                                    className={ENTRY_TOOLBAR_DROPDOWN_ICON_CLASS}
                                  />
                                </Button>
                              </div>
                            )}
                            {isEditable ? (
                              <div
                                ref={setEntryRef(message.id)}
                                data-role="entry-body"
                                data-entry-editable="true"
                                contentEditable
                                suppressContentEditableWarning
                                className={cn(
                                  "rounded-sm border border-transparent px-3 py-2 text-base leading-7 text-[color:var(--page-ink-strong)] transition-colors",
                                  "whitespace-pre-wrap break-words",
                                  "cursor-text hover:border-[color:var(--page-border)] hover:bg-[color:var(--page-card)]/50 focus-within:border-[color:var(--page-border)] focus-within:bg-[color:var(--page-card)]/70"
                                )}
                                onDragOver={handleEntryDragOver}
                                onDragStart={handleEntryDragStart}
                                onDrop={(event) =>
                                  void handleEntryDrop(message, event)
                                }
                                aria-label="Journal entry"
                                dangerouslySetInnerHTML={{ __html: entryHtml }}
                              />
                            ) : (
                              <div
                                data-role="entry-body"
                                className="space-y-3 text-base leading-7 text-[color:var(--page-ink-strong)]"
                              >
                                {renderMarkdown(message.content, {
                                  activeSentenceIndex,
                                })}
                              </div>
                            )}
                          </div>
                          {shouldShowIntent && (
                            <div className="space-y-2 rounded-sm border border-[color:var(--page-border)] bg-[color:var(--page-card)] p-4 text-sm text-[color:var(--page-ink-strong)] shadow-sm shadow-black/5">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--page-muted)]">
                                Intent
                              </p>
                              <div className="space-y-2 leading-relaxed">
                                {intentStatus === "loading" ? (
                                  <p className="text-[color:var(--page-muted)]">
                                    Summarizing intent...
                                  </p>
                                ) : intentStatus === "error" ? (
                                  <p className="text-[color:var(--page-muted)]">
                                    {intentState?.error}
                                  </p>
                                ) : (
                                  renderIntentText(intentText, {
                                    sources: intentSources,
                                    activeCitationId,
                                    lockedCitationId,
                                    onCitationEnter: (citationId) =>
                                      handleCitationEnter(
                                        message.id,
                                        citationId
                                      ),
                                    onCitationLeave: (citationId) =>
                                      handleCitationLeave(
                                        message.id,
                                        citationId
                                      ),
                                    onCitationClick: (citationId) =>
                                      handleCitationClick(
                                        message.id,
                                        citationId
                                      ),
                                  })
                                )}
                              </div>
                              {intentStatus &&
                                intentStatus !== "loading" &&
                                intentStatus !== "error" && (
                                  <div className="flex flex-wrap items-center justify-end gap-2">
                                    {isIntentSaved ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        data-control="intent-delete"
                                        data-message-id={message.id}
                                        className="h-7 px-2 text-[11px] text-[color:var(--page-muted)] hover:text-[color:var(--page-ink-strong)]"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleIntentDelete(message.id);
                                        }}
                                      >
                                        Delete intent
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        data-control="intent-save"
                                        data-message-id={message.id}
                                        className="h-7 px-2 text-[11px]"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleIntentSave(message.id);
                                        }}
                                      >
                                        Save intent
                                      </Button>
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              data-control="entry-tts"
                              data-message-id={message.id}
                              className="h-7 px-2 text-[11px] text-[color:var(--page-muted)] hover:text-[color:var(--page-ink-strong)]"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEntryPlayback(message);
                              }}
                            >
                              Listen
                            </Button>
                            {message.role === "user" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                data-control="entry-intent"
                                data-message-id={message.id}
                                className="h-7 px-2 text-[11px] text-[color:var(--page-muted)] hover:text-[color:var(--page-ink-strong)]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleEntryIntent(message);
                                }}
                                disabled={
                                  intentState?.status === "loading" ||
                                  isIntentSaved
                                }
                                aria-busy={
                                  intentState?.status === "loading"
                                    ? true
                                    : undefined
                                }
                              >
                                {isIntentSaved
                                  ? "Saved"
                                  : intentState?.status === "loading"
                                    ? "Intent..."
                                    : "Intent"}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div
                data-location="journal-footer"
                data-state={shouldShowFooter ? "visible" : "hidden"}
                className={cn(
                  "sticky bottom-0 z-20 backdrop-blur overflow-hidden transition-[max-height,transform,opacity] duration-200 ease-out md:static md:overflow-visible md:max-h-none",
                  isHomeView ? "bg-[color:var(--page-bg)]" : "bg-white/95",
                  shouldShowFooter
                    ? "max-h-[260px] translate-y-0 opacity-100"
                    : "max-h-0 translate-y-3 opacity-0 pointer-events-none"
                )}
              >
                <div className="mx-auto w-full max-w-3xl px-1 py-[1px] space-y-2">
                  <hr
                    data-role="journal-footer-divider"
                    className="m-0 w-full border-t border-[color:var(--page-border)]"
                  />
                  <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 pt-2 text-center text-[12px] leading-[15px] text-[color:var(--page-muted)] sm:gap-y-0 sm:text-[11px] sm:leading-[13px]">
                    <span
                      data-role="journal-instructions"
                      className="hidden font-semibold sm:inline"
                    >
                      Main control:{" "}
                      <strong className="font-semibold text-[color:var(--page-accent-strong)]">
                        Spacebar
                      </strong>{" "}
                      - press{" "}
                      <strong className="font-semibold text-[color:var(--page-accent-strong)]">
                        Space
                      </strong>{" "}
                      to start, pause, or resume; double-tap{" "}
                      <strong className="font-semibold text-[color:var(--page-accent-strong)]">
                        Space
                      </strong>{" "}
                      to stop and send{isComposerVisible ? "." : ","}
                    </span>
                    {!isComposerVisible && (
                      <>
                        <span className="hidden sm:inline">or use</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="min-h-9 rounded-full border border-[color:var(--page-accent-strong)] bg-[color:var(--page-accent-strong)] px-3 py-1.5 text-[12px] font-semibold leading-[14px] text-white shadow-sm shadow-black/10 hover:bg-[color:var(--page-accent)] hover:text-[color:var(--page-ink-strong)] sm:py-1"
                          data-control="composer-toggle"
                          aria-controls={COMPOSER_PANEL_ID}
                          aria-expanded={isComposerVisible}
                          onClick={handleComposerToggle}
                        >
                          Show text entry
                        </Button>
                        <span className="hidden sm:inline">.</span>
                      </>
                    )}
                  </div>

                  <form
                    id={COMPOSER_PANEL_ID}
                    data-control="composer"
                    hidden={!isComposerVisible}
                    className="space-y-2"
                    onSubmit={handleComposerSubmit}
                  >
                    <label
                      htmlFor="journal-composer"
                      className="text-xs uppercase tracking-[0.2em] text-[color:var(--page-muted)]"
                    >
                      Journal entry
                    </label>
                    <Textarea
                      id="journal-composer"
                      name="journal-composer"
                      ref={composerRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={1}
                      className="min-h-[44px] resize-none bg-white"
                      placeholder="Use a direct command if you want a reply."
                    />
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        data-control="composer-toggle"
                        aria-controls={COMPOSER_PANEL_ID}
                        aria-expanded={isComposerVisible}
                        onClick={handleComposerToggle}
                      >
                        Hide text entry
                      </Button>
                      <Button type="submit" size="sm" disabled={isSending}>
                        {isSending ? "Sending" : "Send"}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
