"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  Library,
  PanelLeftClose,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ConversationIndexItem } from "@/lib/storage/types";

type ConversationSidebarProps = {
  conversations: ConversationIndexItem[];
  activeConversationId: string | null;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onNewConversation: () => void;
  onOpenConversation: (conversationId: string) => void;
  onRenameConversation: (conversationId: string, title: string) => void;
  onPinConversation: (conversationId: string, pinned: boolean) => void;
  onArchiveConversation: (conversationId: string, archived: boolean) => void;
  onDeleteConversation: (conversationId: string) => void;
  onCloseSidebar?: () => void;
  isLoading?: boolean;
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const ConversationSidebar = ({
  conversations,
  activeConversationId,
  searchTerm,
  onSearchTermChange,
  onNewConversation,
  onOpenConversation,
  onRenameConversation,
  onPinConversation,
  onArchiveConversation,
  onDeleteConversation,
  onCloseSidebar,
  isLoading = false,
}: ConversationSidebarProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [archivedOpen, setArchivedOpen] = useState(false);

  const { pinned, recent, archived } = useMemo(() => {
    const sortByNewest = (items: ConversationIndexItem[]) =>
      [...items].sort((a, b) => {
        const updatedDelta = b.updatedAt - a.updatedAt;
        if (updatedDelta !== 0) {
          return updatedDelta;
        }
        const createdDelta = b.createdAt - a.createdAt;
        if (createdDelta !== 0) {
          return createdDelta;
        }
        return b.id.localeCompare(a.id);
      });
    const pinnedItems = sortByNewest(
      conversations.filter((item) => item.pinned && !item.archived)
    );
    const archivedItems = sortByNewest(
      conversations.filter((item) => item.archived)
    );
    const recentItems = sortByNewest(
      conversations.filter((item) => !item.pinned && !item.archived)
    );
    return { pinned: pinnedItems, recent: recentItems, archived: archivedItems };
  }, [conversations]);

  const startRename = (item: ConversationIndexItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const submitRename = async () => {
    const trimmed = editingTitle.trim();
    if (!editingId || !trimmed) {
      setEditingId(null);
      return;
    }
    await onRenameConversation(editingId, trimmed);
    setEditingId(null);
  };

  const renderConversation = (item: ConversationIndexItem) => {
    const isActive = item.id === activeConversationId;
    const title = item.title?.trim() || "Untitled chat";
    const preview = item.preview?.trim();
    const previewText = preview ? `${preview}...` : "No entries yet.";
    const timestamp = formatTimestamp(item.updatedAt);
    return (
      <div
        key={item.id}
        className={cn(
          "group flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm transition",
          isActive
            ? "bg-white/90 text-[color:var(--page-ink-strong)] shadow-sm shadow-black/5"
            : "text-[color:var(--page-ink)] hover:bg-white/80"
        )}
        data-active={isActive ? "true" : undefined}
        data-conversation-id={item.id}
      >
        {editingId === item.id ? (
          <div className="flex w-full flex-col gap-2">
            <Input
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
              aria-label="Rename conversation"
              className="h-8 rounded-lg bg-white/90"
            />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={submitRename}>
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-start gap-2 text-left"
              onClick={() => onOpenConversation(item.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{title}</span>
                <span
                  className="block truncate text-xs text-[color:var(--page-muted)]"
                  data-role="preview"
                >
                  {previewText}
                </span>
                <span
                  className="mt-1 block text-[0.65rem] uppercase tracking-[0.2em] text-[color:var(--page-muted)]"
                  data-role="timestamp"
                  title={timestamp}
                >
                  {timestamp}
                </span>
              </span>
            </button>
            <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-[color:var(--page-muted)] hover:text-[color:var(--page-ink-strong)]"
                onClick={() => startRename(item)}
                aria-label="Rename conversation"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-[color:var(--page-muted)] hover:text-[color:var(--page-ink-strong)]"
                onClick={() => onPinConversation(item.id, !item.pinned)}
                aria-label={item.pinned ? "Unpin conversation" : "Pin conversation"}
              >
                <Pin
                  className={cn(
                    "h-3.5 w-3.5",
                    item.pinned ? "text-[color:var(--page-accent-strong)]" : ""
                  )}
                />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-[color:var(--page-muted)] hover:text-[color:var(--page-ink-strong)]"
                onClick={() => onArchiveConversation(item.id, !item.archived)}
                aria-label={
                  item.archived ? "Unarchive conversation" : "Archive conversation"
                }
              >
                <Archive
                  className={cn(
                    "h-3.5 w-3.5",
                    item.archived ? "text-[color:var(--page-accent-strong)]" : ""
                  )}
                />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-[color:var(--page-muted)] hover:text-red-700"
                onClick={() => onDeleteConversation(item.id)}
                aria-label="Delete conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderConversationList = (
    items: ConversationIndexItem[],
    emptyLabel: string = "No conversations."
  ) =>
    items.length === 0 ? (
      <p className="text-xs text-[color:var(--page-muted)]">{emptyLabel}</p>
    ) : (
      <div className="space-y-1">{items.map(renderConversation)}</div>
    );

  const hasChats = pinned.length + recent.length > 0;

  return (
    <aside
      id="conversation-sidebar"
      className="flex h-[100dvh] w-full flex-col rounded-none border-r border-[color:var(--page-border)] bg-[color:var(--page-paper)]"
      data-pane="conversation-sidebar"
    >
      <div
        className="space-y-3 border-b border-[color:var(--page-border)] px-4 pb-4 pt-5"
        data-section="sidebar-actions"
      >
        {onCloseSidebar && (
          <div className="flex items-center justify-end">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-[color:var(--page-muted)] hover:text-[color:var(--page-ink-strong)]"
              onClick={onCloseSidebar}
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full justify-start gap-2 rounded-full border border-[color:var(--page-border)] bg-white/80 px-4 text-sm font-medium text-[color:var(--page-ink-strong)] shadow-sm shadow-black/5 hover:bg-white hover:text-[color:var(--page-ink-strong)]"
          onClick={onNewConversation}
        >
          <Plus className="h-4 w-4" />
          New chat
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--page-muted)]" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-9 rounded-full border-[color:var(--page-border)] bg-white/80 pl-9 text-sm placeholder:text-[color:var(--page-muted)]"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full justify-start gap-2 rounded-full px-3 text-sm text-[color:var(--page-ink)] hover:bg-white/80 hover:text-[color:var(--page-ink-strong)]"
          onClick={() => setArchivedOpen((prev) => !prev)}
          aria-pressed={archivedOpen}
        >
          <Library className="h-4 w-4" />
          Library
        </Button>
        <p className="text-xs text-[color:var(--page-muted)]">
          Conversations are saved locally on this device.
        </p>
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-5 pt-4"
        data-section="chat-list"
      >
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-[color:var(--page-muted)]">
          <span>Chats</span>
          <span className="text-[0.65rem] tracking-[0.2em]">
            {pinned.length + recent.length}
          </span>
        </div>
        {isLoading ? (
          <p className="text-sm text-[color:var(--page-muted)]">
            Loading conversations...
          </p>
        ) : (
          <div className="space-y-4">
            {!hasChats ? (
              <p className="text-xs text-[color:var(--page-muted)]">
                No conversations yet.
              </p>
            ) : (
              <>
                {pinned.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[0.65rem] uppercase tracking-[0.32em] text-[color:var(--page-muted)]">
                      Pinned
                    </p>
                    {renderConversationList(pinned)}
                  </div>
                )}
                <div className="space-y-1">{recent.map(renderConversation)}</div>
              </>
            )}
            {archivedOpen && (
              <div
                className="space-y-2 border-t border-[color:var(--page-border)] pt-3"
                data-section="library-list"
              >
                <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.32em] text-[color:var(--page-muted)]">
                  <span>Archived</span>
                  <span>{archived.length}</span>
                </div>
                {renderConversationList(archived, "No archived conversations.")}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
