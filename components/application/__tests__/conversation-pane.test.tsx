import { renderToStaticMarkup } from "react-dom/server";

import { useLocalConversations } from "@/hooks/use-local-conversations";
import { useRouter, useSearchParams } from "next/navigation";

import {
  buildHomeHrefWithoutNewChat,
  ConversationPane,
  getNewChatRequest,
} from "../conversation-pane";

jest.mock("@/hooks/use-local-conversations", () => ({
  useLocalConversations: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("ConversationPane", () => {
  const mockUseLocalConversations =
    useLocalConversations as jest.MockedFunction<
      typeof useLocalConversations
    >;
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<
    typeof useSearchParams
  >;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    mockUseLocalConversations.mockReturnValue({
      conversations: [],
      activeConversationId: null,
      messages: [],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue(undefined),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue(undefined),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseRouter.mockReturnValue({ replace: jest.fn() });
  });

  afterEach(() => {
    mockUseLocalConversations.mockReset();
    mockUseSearchParams.mockReset();
    mockUseRouter.mockReset();
  });

  it("surfaces the spacebar commands in the header", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain('data-pane="conversation"');
    expect(html).toContain("Main control:");
    expect(html).toMatch(/Main control:\s*<strong[^>]*>Spacebar<\/strong>/);
    expect(html).toMatch(
      /double-tap\s*<strong[^>]*>Space<\/strong>\s*to stop and send\./i
    );
  });

  it("keeps the journal entries pane page-sized with a scrollable stream", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain('data-pane="journal-entries"');
    expect(html).toContain('data-size="page"');
    expect(html).toContain('data-scroll="journal-entries"');
    expect(html).toContain("overflow-y-auto");
  });

  it("locks the page shell to the dynamic viewport height", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain("h-[100dvh]");
    expect(html).toContain("md:overflow-hidden");
  });

  it("moves the text entry toggle into the journal header", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(
      /data-location="journal-header"[\s\S]*Show text entry/
    );
    expect(html).not.toContain(
      "Secondary to voice. Open to add an entry or direct command."
    );
  });

  it("defaults the sidebar to closed with a toggle control", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain('data-sidebar-state="closed"');
    expect(html).toContain('data-control="sidebar-toggle"');
    expect(html).toMatch(/data-control="sidebar-toggle"[^>]*aria-expanded="false"/);
  });

  it("welcomes first-time users with a quick tour and philosophy", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain('data-state="welcome"');
    expect(html).toContain("Welcome to Hey");
    expect(html).toContain("Quick tour");
    expect(html).toContain("Our philosophy");
  });

  it("shows the welcome tour for a new journal even if other chats exist", () => {
    mockUseLocalConversations.mockReturnValueOnce({
      conversations: [
        {
          id: "conv-new",
          title: "Untitled chat",
          preview: "",
          createdAt: 1,
          updatedAt: 1,
          pinned: false,
          archived: false,
          messageCount: 0,
          schemaVersion: 1,
        },
        {
          id: "conv-old",
          title: "Earlier",
          preview: "Started already",
          createdAt: 1,
          updatedAt: 2,
          pinned: false,
          archived: false,
          messageCount: 3,
          schemaVersion: 1,
        },
      ],
      activeConversationId: "conv-new",
      messages: [],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue(undefined),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue(undefined),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain('data-state="welcome"');
    expect(html).toContain("Welcome to Hey");
  });

  it("detects new chat requests in search params", () => {
    expect(getNewChatRequest(new URLSearchParams("new=1"))).toBe("1");
    expect(getNewChatRequest(new URLSearchParams("new="))).toBe("1");
    expect(getNewChatRequest(new URLSearchParams("flag=on"))).toBeNull();
  });

  it("builds a home href without the new chat param", () => {
    expect(buildHomeHrefWithoutNewChat(new URLSearchParams("new=1"))).toBe("/");
    expect(
      buildHomeHrefWithoutNewChat(new URLSearchParams("new=1&source=nav"))
    ).toBe("/?source=nav");
  });
});
