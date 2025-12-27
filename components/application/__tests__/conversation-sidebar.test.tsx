import { renderToStaticMarkup } from "react-dom/server";

import { ConversationSidebar } from "../conversation-sidebar";

const sampleConversations = [
  {
    id: "conv-1",
    title: "Logic Cleanup and Planning",
    preview: "Preview",
    createdAt: 1,
    updatedAt: 2,
    pinned: true,
    archived: false,
    messageCount: 4,
    schemaVersion: 1,
  },
  {
    id: "conv-2",
    title: "Older Recent Conversation",
    preview: "Preview",
    createdAt: 1,
    updatedAt: 3,
    pinned: false,
    archived: false,
    messageCount: 2,
    schemaVersion: 1,
  },
  {
    id: "conv-4",
    title: "Newest Recent Conversation",
    preview: "Preview",
    createdAt: 1,
    updatedAt: 12,
    pinned: false,
    archived: false,
    messageCount: 3,
    schemaVersion: 1,
  },
  {
    id: "conv-3",
    title: "Follow-up Email Feedback",
    preview: "Preview",
    createdAt: 1,
    updatedAt: 4,
    pinned: false,
    archived: true,
    messageCount: 1,
    schemaVersion: 1,
  },
];

const noop = () => {};

describe("ConversationSidebar", () => {
  it("renders the ChatGPT-style action rail", () => {
    const html = renderToStaticMarkup(
      <ConversationSidebar
        conversations={sampleConversations}
        activeConversationId="conv-1"
        searchTerm=""
        onSearchTermChange={noop}
        onNewConversation={noop}
        onOpenConversation={noop}
        onRenameConversation={noop}
        onPinConversation={noop}
        onArchiveConversation={noop}
        onDeleteConversation={noop}
      />
    );

    expect(html).toContain('data-pane="conversation-sidebar"');
    expect(html).toContain("rounded-none");
    expect(html).toContain("h-[100dvh]");
    expect(html).toContain('data-section="sidebar-actions"');
    expect(html).toContain(">New chat<");
    expect(html).toContain('placeholder="Search chats"');
    expect(html).toContain(">Library<");
  });

  it("shows a preview snippet with a timestamp", () => {
    const html = renderToStaticMarkup(
      <ConversationSidebar
        conversations={sampleConversations}
        activeConversationId="conv-1"
        searchTerm=""
        onSearchTermChange={noop}
        onNewConversation={noop}
        onOpenConversation={noop}
        onRenameConversation={noop}
        onPinConversation={noop}
        onArchiveConversation={noop}
        onDeleteConversation={noop}
      />
    );

    expect(html).toContain('data-role="preview"');
    expect(html).toContain("Preview...");
    expect(html).toMatch(/data-role="timestamp"[^>]*>[^<]+<\/span>/);
  });

  it("orders recent chats from newest to oldest", () => {
    const html = renderToStaticMarkup(
      <ConversationSidebar
        conversations={sampleConversations}
        activeConversationId="conv-1"
        searchTerm=""
        onSearchTermChange={noop}
        onNewConversation={noop}
        onOpenConversation={noop}
        onRenameConversation={noop}
        onPinConversation={noop}
        onArchiveConversation={noop}
        onDeleteConversation={noop}
      />
    );

    const newestIndex = html.indexOf("Newest Recent Conversation");
    const olderIndex = html.indexOf("Older Recent Conversation");

    expect(newestIndex).toBeGreaterThan(-1);
    expect(olderIndex).toBeGreaterThan(-1);
    expect(newestIndex).toBeLessThan(olderIndex);
  });

  it("breaks updated timestamp ties by created time", () => {
    const html = renderToStaticMarkup(
      <ConversationSidebar
        conversations={[
          {
            id: "conv-older",
            title: "Older Recent Conversation",
            preview: "Preview",
            createdAt: 1,
            updatedAt: 10,
            pinned: false,
            archived: false,
            messageCount: 1,
            schemaVersion: 1,
          },
          {
            id: "conv-newer",
            title: "Newer Recent Conversation",
            preview: "Preview",
            createdAt: 2,
            updatedAt: 10,
            pinned: false,
            archived: false,
            messageCount: 1,
            schemaVersion: 1,
          },
        ]}
        activeConversationId="conv-newer"
        searchTerm=""
        onSearchTermChange={noop}
        onNewConversation={noop}
        onOpenConversation={noop}
        onRenameConversation={noop}
        onPinConversation={noop}
        onArchiveConversation={noop}
        onDeleteConversation={noop}
      />
    );

    const newerIndex = html.indexOf("Newer Recent Conversation");
    const olderIndex = html.indexOf("Older Recent Conversation");

    expect(newerIndex).toBeGreaterThan(-1);
    expect(olderIndex).toBeGreaterThan(-1);
    expect(newerIndex).toBeLessThan(olderIndex);
  });

  it("marks the active chat in the list", () => {
    const html = renderToStaticMarkup(
      <ConversationSidebar
        conversations={sampleConversations}
        activeConversationId="conv-2"
        searchTerm=""
        onSearchTermChange={noop}
        onNewConversation={noop}
        onOpenConversation={noop}
        onRenameConversation={noop}
        onPinConversation={noop}
        onArchiveConversation={noop}
        onDeleteConversation={noop}
      />
    );

    expect(html).toContain('data-section="chat-list"');
    expect(html).toContain("Older Recent Conversation");
    expect(html).toContain('data-active="true"');
  });
});
