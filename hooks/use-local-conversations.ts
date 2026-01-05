"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getOrCreateMasterKey } from "@/lib/crypto/keys";
import { createConversationService } from "@/lib/services/conversations";
import { createIndexedDbStore } from "@/lib/storage/indexeddb-store";
import type {
  ConversationIndexItem,
  Message,
} from "@/lib/storage/types";

export type LocalConversationState = {
  conversations: ConversationIndexItem[];
  activeConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  createConversation: () => Promise<string | null>;
  openConversation: (conversationId: string) => Promise<void>;
  appendMessage: (message: Message) => Promise<string | null>;
  updateMessage: (
    messageId: string,
    updates: Partial<
      Pick<Message, "content" | "attachments" | "intent" | "intentSources">
    >
  ) => Promise<Message | null>;
  renameConversation: (conversationId: string, title: string) => Promise<void>;
  pinConversation: (conversationId: string, pinned: boolean) => Promise<void>;
  archiveConversation: (conversationId: string, archived: boolean) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export type UseLocalConversationsOptions = {
  initialConversationId?: string | null;
  autoSelectLatest?: boolean;
};

const EMPTY_MESSAGES: Message[] = [];

const createConversationId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `conv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const useLocalConversations = (
  options: UseLocalConversationsOptions = {}
): LocalConversationState => {
  const { initialConversationId, autoSelectLatest = true } = options;
  const isBrowser = typeof window !== "undefined";
  const store = useMemo(
    () => (isBrowser ? createIndexedDbStore() : null),
    [isBrowser]
  );
  const keyPromiseRef = useRef<Promise<CryptoKey> | null>(null);
  const previewHydratedRef = useRef(false);
  const [conversations, setConversations] = useState<ConversationIndexItem[]>(
    []
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [messages, setMessages] = useState<Message[]>(EMPTY_MESSAGES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingConversationIdRef = useRef<string | null>(null);

  const getKey = useCallback(() => {
    if (!store) {
      return Promise.reject(new Error("Storage unavailable"));
    }
    if (!keyPromiseRef.current) {
      keyPromiseRef.current = getOrCreateMasterKey(store);
    }
    return keyPromiseRef.current;
  }, [store]);

  const service = useMemo(() => {
    if (!store) {
      return null;
    }
    return createConversationService({ store, getKey });
  }, [store, getKey]);

  const refresh = useCallback(async () => {
    if (!service) {
      return;
    }
    const list = await service.listConversations();
    setConversations(list);
  }, [service]);

  const loadTranscript = useCallback(
    async (conversationId: string) => {
      if (!service) {
        return null;
      }
      try {
        const transcript = await service.loadConversation(conversationId);
        setMessages(transcript?.messages ?? EMPTY_MESSAGES);
        return transcript;
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Unable to load transcript."
        );
        setMessages(EMPTY_MESSAGES);
        return null;
      }
    },
    [service]
  );

  useEffect(() => {
    if (!service) {
      setIsLoading(false);
      return;
    }
    let active = true;

    const boot = async () => {
      setIsLoading(true);
      try {
        const list = await service.listConversations();
        if (!active) {
          return;
        }
        setConversations(list);

        if (initialConversationId !== undefined) {
          setActiveConversationId(initialConversationId ?? null);
          setMessages(EMPTY_MESSAGES);
          return;
        }

        if (autoSelectLatest) {
          const nextId = list[0]?.id ?? null;
          setActiveConversationId(nextId);
          if (nextId) {
            await loadTranscript(nextId);
          } else {
            setMessages(EMPTY_MESSAGES);
          }
          return;
        }

        setActiveConversationId(null);
        setMessages(EMPTY_MESSAGES);
      } catch (caught) {
        if (!active) {
          return;
        }
        setError(
          caught instanceof Error ? caught.message : "Unable to load history."
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void boot();
    return () => {
      active = false;
    };
  }, [autoSelectLatest, initialConversationId, loadTranscript, service]);

  useEffect(() => {
    if (!service || previewHydratedRef.current || conversations.length === 0) {
      return;
    }
    previewHydratedRef.current = true;

    const hydratePreviews = async () => {
      const updatedList = await Promise.all(
        conversations.map(async (item) => {
          try {
            return (await service.ensurePreviewFromTranscript(item.id)) ?? item;
          } catch {
            return item;
          }
        })
      );
      const changed = updatedList.some(
        (item, index) => item.preview !== conversations[index]?.preview
      );
      if (changed) {
        setConversations(updatedList);
      }
    };

    void hydratePreviews();
  }, [conversations, service]);

  const createConversation = useCallback(async () => {
    if (!service) {
      return null;
    }
    pendingConversationIdRef.current = null;
    try {
      const item = await service.createConversation();
      setActiveConversationId(item.id);
      setMessages(EMPTY_MESSAGES);
      setConversations((prev) => {
        const filtered = prev.filter((entry) => entry.id !== item.id);
        return [item, ...filtered];
      });
      return item.id;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to start a conversation."
      );
      return null;
    }
  }, [service]);

  const openConversation = useCallback(
    async (conversationId: string) => {
      if (!service) {
        return;
      }
      setActiveConversationId(conversationId);
      await loadTranscript(conversationId);
    },
    [loadTranscript, service]
  );

  const appendMessage = useCallback(
    async (message: Message) => {
      if (!service) {
        return null;
      }
      setMessages((prev) => [...prev, message]);
      const queuedConversationId =
        activeConversationId ??
        pendingConversationIdRef.current ??
        createConversationId();
      if (!activeConversationId && !pendingConversationIdRef.current) {
        pendingConversationIdRef.current = queuedConversationId;
      }
      try {
        const nextId = await service.appendMessage(queuedConversationId, message);
        if (pendingConversationIdRef.current === queuedConversationId) {
          pendingConversationIdRef.current = null;
        }
        if (activeConversationId !== nextId) {
          setActiveConversationId(nextId);
        }
        await refresh();
        return nextId;
      } catch (caught) {
        if (pendingConversationIdRef.current === queuedConversationId) {
          pendingConversationIdRef.current = null;
        }
        setError(
          caught instanceof Error ? caught.message : "Unable to save message."
        );
        return null;
      }
    },
    [activeConversationId, refresh, service]
  );

  const updateMessage = useCallback(
    async (
      messageId: string,
      updates: Partial<Pick<Message, "content" | "attachments" | "intent">>
    ) => {
      if (!service || !activeConversationId) {
        return null;
      }
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, ...updates } : message
        )
      );
      try {
        const updated = await service.updateMessage(
          activeConversationId,
          messageId,
          updates
        );
        await refresh();
        return updated;
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Unable to update message."
        );
        await loadTranscript(activeConversationId);
        return null;
      }
    },
    [activeConversationId, loadTranscript, refresh, service]
  );

  const renameConversation = useCallback(
    async (conversationId: string, title: string) => {
      if (!service) {
        return;
      }
      await service.renameConversation(conversationId, title);
      await refresh();
    },
    [refresh, service]
  );

  const pinConversation = useCallback(
    async (conversationId: string, pinned: boolean) => {
      if (!service) {
        return;
      }
      await service.pinConversation(conversationId, pinned);
      await refresh();
    },
    [refresh, service]
  );

  const archiveConversation = useCallback(
    async (conversationId: string, archived: boolean) => {
      if (!service) {
        return;
      }
      await service.archiveConversation(conversationId, archived);
      await refresh();
    },
    [refresh, service]
  );

  const deleteConversation = useCallback(
    async (conversationId: string) => {
      if (!service) {
        return;
      }
      await service.deleteConversation(conversationId);
      const list = await service.listConversations();
      setConversations(list);
      if (conversationId === activeConversationId) {
        const nextId = list[0]?.id ?? null;
        setActiveConversationId(nextId);
        if (nextId) {
          await loadTranscript(nextId);
        } else {
          setMessages(EMPTY_MESSAGES);
        }
      }
    },
    [activeConversationId, loadTranscript, service]
  );

  return {
    conversations,
    activeConversationId,
    messages,
    isLoading,
    error,
    createConversation,
    openConversation,
    appendMessage,
    updateMessage,
    renameConversation,
    pinConversation,
    archiveConversation,
    deleteConversation,
    refresh,
  };
};
