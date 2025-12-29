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
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { ConversationSidebar } from "@/components/application/conversation-sidebar";
import { Button } from "@/components/ui/button";
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

type RenderMarkdownOptions = {
  activeSentenceIndex?: number | null;
};

export const renderMarkdown = (
  text: string,
  options: RenderMarkdownOptions = {}
) => {
  const blocks = parseMarkdownBlocks(text);
  let sentenceIndex = 0;

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
    return (
      <p key={`paragraph-${index}`} className="leading-relaxed">
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
  content: string
): TtsPlaybackItem[] => {
  const segments = buildSentenceSegments(content);
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
};

export function ConversationPane({ conversationId = null }: ConversationPaneProps) {
  const {
    conversations,
    activeConversationId,
    messages,
    isLoading: isHistoryLoading,
    error: historyError,
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
  const [pendingTranscript, setPendingTranscript] =
    useState<PendingTranscript | null>(null);
  const [isPendingSave, setIsPendingSave] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const { isDesktop, isSidebarOpen, closeSidebar, toggleSidebar } =
    useResponsiveSidebar({ defaultOpen: true });
  const streamRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesRef = useRef<Message[]>([]);
  const lastSpacebarTapRef = useRef<number | null>(null);
  const handledPendingTranscriptRef = useRef(false);
  const router = useRouter();
  const routeConversationId = conversationId ?? null;

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
    (messageId: string, content: string) => {
      const items = buildTtsQueueItems(messageId, content);
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
  const audioLabel = AUDIO_STATUS_COPY[ttsStatus] ?? "Audio idle";

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
    (messageId: string, content: string) => {
      clearTts();
      enqueueMessagePlayback(messageId, content);
    },
    [clearTts, enqueueMessagePlayback]
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

  return (
    <div
      className="relative h-[100dvh] overflow-x-hidden overflow-y-auto bg-white text-[color:var(--page-ink)] md:overflow-hidden"
      data-pane="conversation"
    >
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
          className="flex min-h-[100dvh] flex-1 flex-col bg-white px-6 py-3 md:min-h-0 md:overflow-hidden md:px-10 md:py-4"
          data-layout="journal-canvas"
        >
          <div className="flex w-full flex-1 min-h-0 flex-col gap-3 md:mx-auto">
            <div className="flex items-center justify-between gap-4">
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
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--page-muted)]">
                Journal
              </p>
            </div>

            <section
              data-pane="journal-entries"
              data-size="page"
              data-layout="journal-canvas"
              className="flex min-h-[60dvh] flex-1 flex-col md:min-h-0"
            >
              <div
                data-sticky="journal-controls"
                className="sticky top-0 z-20 border-b border-[color:var(--page-border)] bg-white/95 backdrop-blur"
              >
                <div className="mx-auto w-full max-w-3xl space-y-1 px-1 py-2">
                  <div
                    data-location="journal-header"
                    className="flex flex-wrap items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--page-muted)]">
                        Voice journal
                      </p>
                      <p className="text-xs leading-5 text-[color:var(--page-muted)]">
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
                    </div>
                    {!isComposerVisible && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        data-control="composer-toggle"
                        aria-controls={COMPOSER_PANEL_ID}
                        aria-expanded={isComposerVisible}
                        onClick={handleComposerToggle}
                      >
                        Show text entry
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div
                      data-pane="voice-controls"
                      className="flex items-center gap-3"
                    >
                      <Button
                        data-control="mic"
                        className={cn(
                          "h-12 w-12 rounded-full text-[11px] font-semibold",
                          voiceStatus === "recording"
                            ? "bg-[color:var(--page-accent-strong)] text-white"
                            : "bg-[color:var(--page-accent)] text-[color:var(--page-ink-strong)]"
                        )}
                        onClick={handleMicClick}
                        aria-pressed={
                          voiceStatus === "recording" || voiceStatus === "paused"
                        }
                        disabled={
                          voiceStatus === "processing" || voiceStatus === "ready"
                        }
                      >
                        {micButtonLabel}
                      </Button>
                      <div>
                        <p className="text-[13px] font-semibold text-[color:var(--page-ink-strong)]">
                          {micCopy.label}
                        </p>
                        <p className="text-[11px] text-[color:var(--page-muted)]">
                          {micCopy.helper}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--page-muted)]">
                        {audioLabel}
                      </span>
                      <span className="text-[12px] text-[color:var(--page-muted)]">
                        {audioQueueLabel}
                      </span>
                      <Button
                        data-control="stop-audio"
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
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

                  {sendError && (
                    <p className="text-sm text-red-700">{sendError}</p>
                  )}

                  {historyError && (
                    <p className="text-sm text-red-700">{historyError}</p>
                  )}

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

              <div
                ref={streamRef}
                data-stream="messages"
                data-scroll="journal-entries"
                className="flex-1 overflow-y-auto"
              >
                <div className="mx-auto w-full max-w-3xl space-y-5 px-1 py-3">
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

                      return (
                        <div key={message.id} className="space-y-3">
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
                          <div className="space-y-3 text-base leading-7 text-[color:var(--page-ink-strong)]">
                            {renderMarkdown(message.content, {
                              activeSentenceIndex,
                            })}
                          </div>
                          <div className="flex items-center justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              data-control="entry-tts"
                              data-message-id={message.id}
                              className="h-7 px-2 text-[11px] text-[color:var(--page-muted)] hover:text-[color:var(--page-ink-strong)]"
                              onClick={() =>
                                handleEntryPlayback(message.id, message.content)
                              }
                            >
                              Listen
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
