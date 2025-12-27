"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { ConversationSidebar } from "@/components/application/conversation-sidebar";
import { SiteNav } from "@/components/application/site-nav";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useLocalConversations } from "@/hooks/use-local-conversations";
import { useResponsiveSidebar } from "@/hooks/use-responsive-sidebar";
import { useTtsPlayback } from "@/hooks/use-tts-playback";
import { useVoiceCapture } from "@/hooks/use-voice-capture";
import { looksLikeExplicitRequest } from "@/lib/explicit-request";
import type { Message as StoredMessage } from "@/lib/storage/types";
import { cn } from "@/lib/utils";

type MessageRole = StoredMessage["role"];
type Message = StoredMessage;

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

type InlineToken = {
  type: "text" | "strong" | "em" | "code";
  content: string;
};

type SpacebarShortcutTarget = EventTarget | {
  tagName?: string;
  isContentEditable?: boolean;
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

const AUDIO_STATUS_COPY: Record<string, string> = {
  idle: "Audio idle",
  loading: "Preparing audio...",
  playing: "Speaking...",
  stopped: "Audio stopped",
  error: "Audio error",
};

const TEXT_ENTRY_NOTICE = "Use a direct command if you want a reply.";

const COMPOSER_PANEL_ID = "journal-composer-panel";
const NEW_CHAT_QUERY_KEY = "new";

const WELCOME_TOUR_ITEMS = [
  {
    title: "Voice capture",
    description:
      "Tap the mic or press Space to start. Pause or resume with Space; double-tap Space to stop and send.",
  },
  {
    title: "Text entry on demand",
    description:
      "Use Show text entry for typed notes or direct commands when you prefer the keyboard.",
  },
  {
    title: "Spoken replies",
    description:
      "Replies show up only after explicit commands and are spoken aloud by default.",
  },
  {
    title: "Local history rail",
    description:
      "Open the left sidebar to browse, pin, rename, or archive your chats.",
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
    description:
      "No responses unless you explicitly ask for one.",
  },
  {
    title: "Predictable control",
    description:
      "Clear mic and playback states keep voice work calm and intentional.",
  },
];

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

  const tagName =
    typeof element.tagName === "string" ? element.tagName.toLowerCase() : "";
  if (tagName === "textarea" || tagName === "input" || tagName === "select") {
    return true;
  }

  if (typeof element.closest === "function") {
    const editableParent = element.closest(
      'textarea, input, select, [contenteditable="true"], [contenteditable=""]'
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

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

export const renderMarkdown = (text: string) => {
  const blocks = parseMarkdownBlocks(text);
  return blocks.map((block, index) => {
    if (block.type === "code") {
      return (
        <pre
          key={`code-${index}`}
          className="overflow-x-auto rounded-xl bg-[color:var(--page-ink-strong)]/90 p-4 text-xs text-white"
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
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={`paragraph-${index}`} className="leading-relaxed">
        {renderInlineMarkdown(block.content)}
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

const buildPlaceholderReply = () =>
  "I ran into a problem generating a reply. Please try again in a moment.";

export const getNewChatRequest = (
  params?: Pick<URLSearchParams, "get"> | null
) => {
  if (!params) {
    return null;
  }
  const value = params.get(NEW_CHAT_QUERY_KEY);
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || "1";
};

export const buildHomeHrefWithoutNewChat = (
  params?: Pick<URLSearchParams, "toString"> | null
) => {
  const nextParams = new URLSearchParams(params?.toString() ?? "");
  nextParams.delete(NEW_CHAT_QUERY_KEY);
  const query = nextParams.toString();
  return query ? `/?${query}` : "/";
};

const WelcomePanel = () => (
  <div
    data-state="welcome"
    className="space-y-6 rounded-2xl border border-[color:var(--page-border)] bg-white/80 p-5 shadow-sm shadow-black/5"
  >
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
        Welcome
      </p>
      <h3 className="font-display text-2xl text-[color:var(--page-ink-strong)]">
        Welcome to Hey
      </h3>
      <p className="text-sm text-[color:var(--page-muted)]">
        Your voice-first journal. Here is a quick tour and the philosophy
        behind it.
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
    <div className="rounded-2xl border border-[color:var(--page-border)] bg-[color:var(--page-paper)]/80 p-4 text-sm text-[color:var(--page-muted)]">
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

export function ConversationPane() {
  const {
    conversations,
    activeConversationId,
    messages,
    isLoading: isHistoryLoading,
    error: historyError,
    createConversation,
    openConversation,
    appendMessage,
    renameConversation,
    pinConversation,
    archiveConversation,
    deleteConversation,
  } = useLocalConversations();
  const [searchTerm, setSearchTerm] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isComposerVisible, setIsComposerVisible] = useState(false);
  const { isDesktop, isSidebarOpen, closeSidebar, toggleSidebar } =
    useResponsiveSidebar();
  const streamRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const lastSpacebarTapRef = useRef<number | null>(null);
  const handledNewChatRef = useRef<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

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
  const shouldShowWelcome = !isHistoryLoading && messages.length === 0;
  const newChatToken = useMemo(
    () => getNewChatRequest(searchParams),
    [searchParams]
  );

  const handleOpenConversation = useCallback(
    async (conversationId: string) => {
      await openConversation(conversationId);
      if (!isDesktop) {
        closeSidebar();
      }
    },
    [closeSidebar, isDesktop, openConversation]
  );

  const handleNewConversation = useCallback(async () => {
    await createConversation();
    if (!isDesktop) {
      closeSidebar();
    }
  }, [closeSidebar, createConversation, isDesktop]);

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
    error: ttsError,
    enqueue: enqueueTts,
    clear: clearTts,
  } = useTtsPlayback();

  useEffect(() => {
    if (!newChatToken) {
      handledNewChatRef.current = null;
      return;
    }
    if (isHistoryLoading) {
      return;
    }
    if (handledNewChatRef.current === newChatToken) {
      return;
    }
    handledNewChatRef.current = newChatToken;
    void handleNewConversation();
    router.replace(buildHomeHrefWithoutNewChat(searchParams));
  }, [
    handleNewConversation,
    isHistoryLoading,
    newChatToken,
    router,
    searchParams,
  ]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    voiceStatusRef.current = voiceStatus;
  }, [voiceStatus]);

  const pushMessage = useCallback(
    (message: Message) => {
      messagesRef.current = [...messagesRef.current, message];
      void appendMessage(message);
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

        pushMessage({
          id: createId(),
          role: "assistant",
          content: assistantMessage,
          createdAt: Date.now(),
        });

        enqueueTts(stripSavedUpdatesForTts(assistantMessage));
      } catch (error) {
        setSendError(
          error instanceof Error
            ? error.message
            : "Unable to generate a reply."
        );

        const fallback = buildPlaceholderReply();
        pushMessage({
          id: createId(),
          role: "assistant",
          content: fallback,
          createdAt: Date.now(),
        });
        enqueueTts(stripSavedUpdatesForTts(fallback));
      }
    },
    [clearTts, enqueueTts, pushMessage]
  );

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
  const audioLabel = AUDIO_STATUS_COPY[ttsStatus] ?? "Audio idle";

  const handleComposerToggle = () => {
    setIsComposerVisible((prev) => !prev);
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

  const audioQueueLabel = useMemo(() => {
    if (ttsQueue.length === 0) {
      return "No queued audio";
    }
    if (ttsQueue.length === 1) {
      return "1 reply queued";
    }
    return `${ttsQueue.length} replies queued`;
  }, [ttsQueue.length]);
  const sidebarState = isSidebarOpen ? "open" : "closed";
  const sidebarToggleLabel = isSidebarOpen ? "Close sidebar" : "Open sidebar";

  return (
    <div
      className="relative h-[100dvh] overflow-x-hidden overflow-y-auto bg-[color:var(--page-bg)] text-[color:var(--page-ink)] md:overflow-hidden"
      data-pane="conversation"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-12 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_top,_rgba(198,214,226,0.6),_transparent_70%)] blur-2xl animate-drift" />
        <div className="absolute right-[-8rem] top-1/4 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_30%_30%,_rgba(244,216,172,0.6),_transparent_70%)] blur-3xl animate-drift-slow" />
        <div className="absolute bottom-[-6rem] left-1/4 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(201,225,214,0.55),_transparent_70%)] blur-3xl animate-drift" />
      </div>

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
            onNewConversation={handleNewConversation}
            onOpenConversation={handleOpenConversation}
            onRenameConversation={renameConversation}
            onPinConversation={pinConversation}
            onArchiveConversation={archiveConversation}
            onDeleteConversation={deleteConversation}
            onCloseSidebar={closeSidebar}
            isLoading={isHistoryLoading}
          />
        </div>

        <main className="flex min-h-[100dvh] flex-1 flex-col px-6 py-10 md:min-h-0 md:overflow-hidden md:px-10 md:py-12">
          <div className="flex w-full max-w-6xl flex-1 min-h-0 flex-col gap-8 md:mx-auto">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-[color:var(--page-muted)] hover:text-[color:var(--page-ink-strong)]"
                data-control="sidebar-toggle"
                aria-controls="conversation-sidebar"
                aria-expanded={isSidebarOpen}
                onClick={toggleSidebar}
              >
                {isSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
                <span className="sr-only">{sidebarToggleLabel}</span>
              </Button>
              <SiteNav current="home" />
            </div>
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--page-muted)]">
                  Voice journal
                </p>
                <h1 className="font-display text-4xl text-[color:var(--page-ink-strong)]">
                  Journal
                </h1>
              </div>
              <div className="space-y-1 text-sm text-[color:var(--page-muted)]">
                <p>
                  Main control:{" "}
                  <strong className="font-semibold text-[color:var(--page-ink-strong)]">
                    Spacebar
                  </strong>
                  . Press{" "}
                  <strong className="font-semibold text-[color:var(--page-ink-strong)]">
                    Space
                  </strong>{" "}
                  to start, pause, or resume; double-tap{" "}
                  <strong className="font-semibold text-[color:var(--page-ink-strong)]">
                    Space
                  </strong>{" "}
                  to stop and send.
                </p>
                <p>Use a direct command if you want a reply.</p>
              </div>
            </header>

            <section className="flex flex-col gap-6 md:min-h-0 md:flex-1">
              <div className="grid gap-6 md:flex-1 md:min-h-0 md:grid-cols-[0.9fr_1.1fr] md:grid-rows-[minmax(0,1fr)]">
                <Card
                  data-pane="voice-controls"
                  className="bg-[color:var(--page-card)] shadow-xl shadow-black/5 md:sticky md:top-10 md:self-start"
                >
                  <CardHeader>
                    <CardTitle>Voice controls</CardTitle>
                    <CardDescription>
                      Push to talk, then tap again to capture.{" "}
                      <strong className="font-semibold text-[color:var(--page-ink-strong)]">
                        Spacebar
                      </strong>{" "}
                      runs the mic: press{" "}
                      <strong className="font-semibold text-[color:var(--page-ink-strong)]">
                        Space
                      </strong>{" "}
                      to pause or resume; double-tap{" "}
                      <strong className="font-semibold text-[color:var(--page-ink-strong)]">
                        Space
                      </strong>{" "}
                      to stop and send.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button
                    data-control="mic"
                    className={cn(
                      "h-16 w-16 rounded-full text-xs font-semibold",
                      voiceStatus === "recording"
                        ? "bg-[color:var(--page-accent-strong)] text-white"
                        : "bg-[color:var(--page-accent)] text-[color:var(--page-ink-strong)]"
                    )}
                    onClick={handleMicClick}
                    aria-pressed={
                      voiceStatus === "recording" || voiceStatus === "paused"
                    }
                    disabled={voiceStatus === "processing" || voiceStatus === "ready"}
                  >
                    {micButtonLabel}
                  </Button>
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--page-ink-strong)]">
                      {micCopy.label}
                    </p>
                    <p className="text-xs text-[color:var(--page-muted)]">
                      {micCopy.helper}
                    </p>
                  </div>
                </div>

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

                {voiceError && (
                  <p className="text-sm text-red-700">{voiceError}</p>
                )}

                {voiceNotice && (
                  <p className="text-sm text-amber-700">{voiceNotice}</p>
                )}

                <div className="space-y-2 rounded-2xl border border-[color:var(--page-border)] bg-white/60 p-4">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[color:var(--page-muted)]">
                    <span>Audio playback</span>
                    <span>{audioLabel}</span>
                  </div>
                  <p className="text-sm text-[color:var(--page-muted)]">
                    {audioQueueLabel}
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      data-control="stop-audio"
                      variant="outline"
                      size="sm"
                      onClick={clearTts}
                      disabled={ttsStatus === "idle" && ttsQueue.length === 0}
                    >
                      Stop audio
                    </Button>
                    {ttsError && (
                      <span className="text-xs text-red-700">{ttsError}</span>
                    )}
                  </div>
                </div>

                {sendError && (
                  <p className="text-sm text-red-700">{sendError}</p>
                )}

                {historyError && (
                  <p className="text-sm text-red-700">{historyError}</p>
                )}
                  </CardContent>
                </Card>

                <Card
                  data-pane="journal-entries"
                  data-size="page"
                  className="flex h-full min-h-0 flex-col bg-[color:var(--page-card)] shadow-xl shadow-black/5"
                >
                  <CardHeader>
                    <div
                      data-location="journal-header"
                      className="flex flex-wrap items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <CardTitle>Journal entries</CardTitle>
                        <CardDescription>
                          Voice turns are transcribed. Text entries and replies appear below.
                        </CardDescription>
                      </div>
                      {!isComposerVisible && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-control="composer-toggle"
                          aria-controls={COMPOSER_PANEL_ID}
                          aria-expanded={isComposerVisible}
                          onClick={handleComposerToggle}
                        >
                          Show text entry
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex min-h-0 flex-1 flex-col gap-6">
                <div
                  ref={streamRef}
                  data-stream="messages"
                  data-scroll="journal-entries"
                  className="flex-1 min-h-0 space-y-4 overflow-y-auto rounded-2xl border border-[color:var(--page-border)] bg-white/70 p-4"
                >
                  {isHistoryLoading ? (
                    <div className="text-sm text-[color:var(--page-muted)]">
                      Loading your journal history...
                    </div>
                  ) : messages.length === 0 ? (
                    shouldShowWelcome ? (
                      <WelcomePanel />
                    ) : (
                      <div className="text-sm text-[color:var(--page-muted)]">
                        Say your entry to get started.
                      </div>
                    )
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "space-y-2 rounded-2xl border p-4",
                          message.role === "user"
                            ? "ml-auto border-[color:var(--page-accent)]/50 bg-[color:var(--page-accent)]/15"
                            : "border-[color:var(--page-border)] bg-white"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--page-muted)]">
                            {message.role === "user" ? "Entry" : "Reply"}
                          </span>
                        </div>
                        <div className="space-y-3 text-sm text-[color:var(--page-ink-strong)]">
                          {renderMarkdown(message.content)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form
                  id={COMPOSER_PANEL_ID}
                  data-control="composer"
                  hidden={!isComposerVisible}
                  className="space-y-3 rounded-2xl border border-[color:var(--page-border)] bg-white/70 p-4"
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

                <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--page-muted)]">
                  Voice-first journal. Use a direct command to get a reply.
                </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
