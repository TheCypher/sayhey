"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ChevronDown,
  Library,
  MoreHorizontal,
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

const MAX_TITLE_LENGTH = 30;
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const buildJournalHref = (conversationId: string) =>
  `/journals/${encodeURIComponent(conversationId)}`;

const truncateTitle = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_TITLE_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_TITLE_LENGTH - 3)}...`;
};

const formatConversationTimestamp = (timestamp: number) => {
  if (!Number.isFinite(timestamp)) {
    return "";
  }
  return DATE_TIME_FORMATTER.format(new Date(timestamp));
};

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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || target.closest('[data-menu="conversation-actions"]')) {
        return;
      }
      setOpenMenuId(null);
    };

    document.addEventListener("click", handleDocumentClick);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

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
    const displayTitle = truncateTitle(title);
    const timestamp = formatConversationTimestamp(item.updatedAt);
    const isMenuOpen = openMenuId === item.id;
    return (
      <div
        key={item.id}
        className={cn(
          "group relative flex items-center justify-between gap-2 rounded-2xl px-3 py-2 text-base transition",
          isActive
            ? "bg-[color:var(--page-bg)] text-[color:var(--page-ink-strong)]"
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
            <Link
              href={buildJournalHref(item.id)}
              className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
              onClick={() => onOpenConversation(item.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="min-w-0" data-role="title-stack">
                <span className="block truncate font-medium">
                  {displayTitle}
                </span>
                {timestamp && (
                  <span
                    data-role="timestamp"
                    data-timestamp={item.updatedAt}
                    className="block whitespace-nowrap text-xs text-[color:var(--page-muted)]"
                  >
                    {timestamp}
                  </span>
                )}
              </div>
            </Link>
            <div
              className={cn(
                "relative flex items-center",
                isMenuOpen
                  ? "opacity-100"
                  : "opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
              )}
              data-menu="conversation-actions"
            >
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-[color:var(--page-muted)] hover:text-[color:var(--page-ink-strong)]"
                onClick={() =>
                  setOpenMenuId(isMenuOpen ? null : item.id)
                }
                aria-label="Open conversation actions"
                aria-expanded={isMenuOpen}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {isMenuOpen && (
                <div
                  className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-[color:var(--page-border)] bg-white p-1 shadow-sm shadow-black/10"
                  data-menu="conversation-actions"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start gap-2 px-2 text-xs"
                    onClick={() => {
                      setOpenMenuId(null);
                      startRename(item);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Rename
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start gap-2 px-2 text-xs"
                    onClick={() => {
                      setOpenMenuId(null);
                      onPinConversation(item.id, !item.pinned);
                    }}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    {item.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start gap-2 px-2 text-xs"
                    onClick={() => {
                      setOpenMenuId(null);
                      onArchiveConversation(item.id, !item.archived);
                    }}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {item.archived ? "Unarchive" : "Archive"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start gap-2 px-2 text-xs text-red-700 hover:text-red-700"
                    onClick={() => {
                      setOpenMenuId(null);
                      onDeleteConversation(item.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderConversationList = (
    items: ConversationIndexItem[],
    emptyLabel: string = "No chats."
  ) =>
    items.length === 0 ? (
      <p className="text-sm text-[color:var(--page-muted)]">{emptyLabel}</p>
    ) : (
      <div className="space-y-1">{items.map(renderConversation)}</div>
    );

  const primaryChats = [...pinned, ...recent];
  const hasChats = primaryChats.length > 0;

  return (
    <aside
      id="conversation-sidebar"
      className="flex h-[100dvh] w-full flex-col rounded-none border-r border-[color:var(--page-border)] bg-[color:var(--page-paper)]"
      data-pane="conversation-sidebar"
    >
      <div
        className="space-y-2 px-4 pb-4 pt-5"
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
          className="h-10 w-full justify-start gap-3 rounded-none px-2 text-base font-medium text-[color:var(--page-ink-strong)] hover:bg-white/80"
          onClick={onNewConversation}
        >
          <Plus className="h-4 w-4" />
          New Journal
        </Button>
        <div className="flex items-center gap-3 px-2">
          <Search className="h-4 w-4 text-[color:var(--page-muted)]" />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Search Journals"
            aria-label="Search Journals"
            className="h-10 flex-1 rounded-none border-transparent bg-transparent p-0 text-base placeholder:text-[color:var(--page-muted)] shadow-none focus-visible:ring-0"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full justify-start gap-3 rounded-none px-2 text-base text-[color:var(--page-ink)] hover:bg-white/80 hover:text-[color:var(--page-ink-strong)]"
          onClick={() => setArchivedOpen((prev) => !prev)}
          aria-pressed={archivedOpen}
        >
          <Library className="h-4 w-4" />
          Library
        </Button>
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-5 pt-2"
        data-section="chat-list"
      >
        <div className="flex items-center gap-2 text-sm text-[color:var(--page-muted)]">
          <span>Journals</span>
          <ChevronDown className="h-4 w-4" />
        </div>
        {isLoading ? (
          <p className="text-sm text-[color:var(--page-muted)]">
            Loading conversations...
          </p>
        ) : (
          <div className="space-y-3">
            {!hasChats ? (
              <p className="text-sm text-[color:var(--page-muted)]">
                No journals yet.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  {primaryChats.map(renderConversation)}
                </div>
              </>
            )}
            {archivedOpen && (
              <div
                className="space-y-2 border-t border-[color:var(--page-border)] pt-3"
                data-section="library-list"
              >
                <div className="flex items-center justify-between text-sm text-[color:var(--page-muted)]">
                  <span>Archived</span>
                  <span>{archived.length}</span>
                </div>
                {renderConversationList(archived, "No archived chats.")}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
