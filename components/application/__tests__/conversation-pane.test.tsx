import { renderToStaticMarkup } from "react-dom/server";

import { useLocalConversations } from "@/hooks/use-local-conversations";
import { useResponsiveSidebar } from "@/hooks/use-responsive-sidebar";
import { useTtsPlayback } from "@/hooks/use-tts-playback";
import { useRouter } from "next/navigation";

import { ConversationSidebar } from "../conversation-sidebar";
import {
  buildJournalHref,
  ConversationPane,
  renderMarkdown,
  renderPlainText,
  shouldAutoSavePendingTranscript,
} from "../conversation-pane";

const mockNextLink = jest.fn((props: any) => {
  const { href, children, prefetch, ...rest } = props;

  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
});

jest.mock("next/link", () => ({
  __esModule: true,
  default: (props: any) => mockNextLink(props),
}));

jest.mock("@/hooks/use-local-conversations", () => ({
  useLocalConversations: jest.fn(),
}));

jest.mock("@/hooks/use-responsive-sidebar", () => ({
  useResponsiveSidebar: jest.fn(),
}));

jest.mock("@/hooks/use-tts-playback", () => ({
  useTtsPlayback: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../conversation-sidebar", () => ({
  ConversationSidebar: jest.fn(() => null),
}));

describe("ConversationPane", () => {
  const mockUseLocalConversations =
    useLocalConversations as jest.MockedFunction<
      typeof useLocalConversations
    >;
  const mockUseResponsiveSidebar =
    useResponsiveSidebar as jest.MockedFunction<typeof useResponsiveSidebar>;
  const mockUseTtsPlayback = useTtsPlayback as jest.MockedFunction<
    typeof useTtsPlayback
  >;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockConversationSidebar =
    ConversationSidebar as jest.MockedFunction<typeof ConversationSidebar>;

  beforeEach(() => {
    mockUseLocalConversations.mockReturnValue({
      conversations: [],
      activeConversationId: null,
      messages: [],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseResponsiveSidebar.mockReturnValue({
      isDesktop: true,
      isSidebarOpen: true,
      closeSidebar: jest.fn(),
      toggleSidebar: jest.fn(),
      openSidebar: jest.fn(),
      setIsSidebarOpen: jest.fn(),
    });
    mockUseTtsPlayback.mockReturnValue({
      status: "idle",
      queue: [],
      error: null,
      currentItem: null,
      enqueue: jest.fn(),
      clear: jest.fn(),
    });
    mockUseRouter.mockReturnValue({ replace: jest.fn(), push: jest.fn() });
  });

  afterEach(() => {
    mockUseLocalConversations.mockReset();
    mockUseResponsiveSidebar.mockReset();
    mockUseTtsPlayback.mockReset();
    mockUseRouter.mockReset();
    mockConversationSidebar.mockClear();
    mockNextLink.mockClear();
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

  it("renders a greeting button for signed-in users", () => {
    const html = renderToStaticMarkup(
      <ConversationPane displayName="Taylor" />
    );

    expect(html).toContain('data-control="account-menu"');
    expect(html).toContain("Taylor");
  });

  it("shows the account menu content when opened", () => {
    const html = renderToStaticMarkup(
      <ConversationPane
        displayName="Taylor"
        userEmail="taylor@example.com"
        initialAccountMenuOpen
      />
    );

    expect(html).toContain('data-menu="account"');
    expect(html).toContain("Welcome tour");
    expect(html).toContain("Account");
    expect(html).toContain("Logout");
  });

  it("disables prefetch on the logout menu link", () => {
    renderToStaticMarkup(
      <ConversationPane
        displayName="Taylor"
        userEmail="taylor@example.com"
        initialAccountMenuOpen
      />
    );

    const logoutCall = mockNextLink.mock.calls.find(
      ([props]) => props?.href === "/auth/logout"
    );

    expect(logoutCall?.[0].prefetch).toBe(false);
  });

  it("routes the sidebar new journal action to the homepage", () => {
    const push = jest.fn();
    mockUseRouter.mockReturnValue({ replace: jest.fn(), push });

    renderToStaticMarkup(<ConversationPane />);

    const sidebarProps = mockConversationSidebar.mock.calls[0]?.[0];
    expect(sidebarProps).toBeDefined();

    sidebarProps?.onNewConversation();

    expect(push).toHaveBeenCalledWith("/");
  });

  it("starts new journals without preselecting an existing conversation", () => {
    renderToStaticMarkup(<ConversationPane />);

    expect(mockUseLocalConversations).toHaveBeenCalledWith({
      initialConversationId: null,
    });
  });

  it("initializes the active conversation when a journal id is provided", () => {
    renderToStaticMarkup(<ConversationPane conversationId="conv-123" />);

    expect(mockUseLocalConversations).toHaveBeenCalledWith({
      initialConversationId: "conv-123",
    });
  });

  it("renders a full-width white journal canvas for past journals", () => {
    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    expect(html).toContain('data-layout="journal-canvas"');
    expect(html).toContain("bg-white");
  });

  it("keeps the journal entries pane page-sized with a scrollable stream", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain('data-pane="journal-entries"');
    expect(html).toContain('data-size="page"');
    expect(html).toContain('data-scroll="journal-entries"');
    expect(html).toContain("overflow-y-auto");
  });

  it("keeps the journal entries pane tall on small screens", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain('data-pane="journal-entries"');
    expect(html).toContain("min-h-[60dvh]");
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

  it("keeps the controls sticky above the journal stream", () => {
    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    const controlsIndex = html.indexOf('data-sticky="journal-controls"');
    const streamIndex = html.indexOf('data-stream="messages"');

    expect(controlsIndex).toBeGreaterThan(-1);
    expect(streamIndex).toBeGreaterThan(-1);
    expect(controlsIndex).toBeLessThan(streamIndex);
  });

  it("removes the privacy callout from the journal view", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).not.toContain("Privacy First - By Design");
    expect(html).not.toContain('data-panel="privacy"');
  });

  it("omits the top navigation in the journal view", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).not.toContain('data-nav="primary"');
  });

  it("shows timestamps for journal entries", () => {
    mockUseLocalConversations.mockReturnValueOnce({
      conversations: [],
      activeConversationId: "conv-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "Hello",
          createdAt: 1700000000000,
        },
      ],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    expect(html).toContain('data-role="timestamp"');
    expect(html).toContain('data-timestamp="1700000000000"');
  });

  it("adds a listen control to each entry in history view", () => {
    mockUseLocalConversations.mockReturnValueOnce({
      conversations: [],
      activeConversationId: "conv-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "Hello",
          createdAt: 1700000000000,
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "Hi there",
          createdAt: 1700000001000,
        },
      ],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    const matches = html.match(/data-control="entry-tts"/g) ?? [];
    expect(matches).toHaveLength(2);
    expect(html).toContain('data-message-id="msg-1"');
    expect(html).toContain('data-message-id="msg-2"');
  });

  it("adds a listen control to each entry on the home view", () => {
    mockUseLocalConversations.mockReturnValueOnce({
      conversations: [],
      activeConversationId: "conv-2",
      messages: [
        {
          id: "msg-3",
          role: "user",
          content: "Day one",
          createdAt: 1700000000000,
        },
        {
          id: "msg-4",
          role: "assistant",
          content: "Reply back",
          createdAt: 1700000001000,
        },
      ],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const html = renderToStaticMarkup(<ConversationPane />);

    const matches = html.match(/data-control="entry-tts"/g) ?? [];
    expect(matches).toHaveLength(2);
    expect(html).toContain('data-message-id="msg-3"');
    expect(html).toContain('data-message-id="msg-4"');
  });

  it("highlights the active sentence while audio plays", () => {
    mockUseLocalConversations.mockReturnValueOnce({
      conversations: [],
      activeConversationId: "conv-3",
      messages: [
        {
          id: "msg-1",
          role: "assistant",
          content: "First sentence. Second sentence.",
          createdAt: 1700000000000,
        },
      ],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseTtsPlayback.mockReturnValueOnce({
      status: "playing",
      queue: [],
      error: null,
      currentItem: {
        id: "tts-1",
        text: "Second sentence.",
        meta: {
          messageId: "msg-1",
          sentenceIndex: 1,
        },
      },
      enqueue: jest.fn(),
      clear: jest.fn(),
    });

    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    expect(html).toContain('data-sentence-index="1"');
    expect(html).toContain('data-sentence-state="active"');
  });

  it("keeps the active sentence highlighted while audio loads", () => {
    mockUseLocalConversations.mockReturnValueOnce({
      conversations: [],
      activeConversationId: "conv-4",
      messages: [
        {
          id: "msg-1",
          role: "assistant",
          content: "First sentence. Second sentence.",
          createdAt: 1700000000000,
        },
      ],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseTtsPlayback.mockReturnValueOnce({
      status: "loading",
      queue: [],
      error: null,
      currentItem: {
        id: "tts-2",
        text: "Second sentence.",
        meta: {
          messageId: "msg-1",
          sentenceIndex: 1,
        },
      },
      enqueue: jest.fn(),
      clear: jest.fn(),
    });

    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    expect(html).toContain('data-sentence-index="1"');
    expect(html).toContain('data-sentence-state="active"');
  });

  it("splits sentences that end with quotes for highlighting", () => {
    const html = renderToStaticMarkup(
      <div>{renderMarkdown('He said "Hello." She replied.')}</div>
    );

    const matches = html.match(/data-sentence-index/g) ?? [];
    expect(matches).toHaveLength(2);
  });

  it("renders plain text without markdown formatting", () => {
    const html = renderToStaticMarkup(
      <div>{renderPlainText("Line one\nLine two **bold**")}</div>
    );

    expect(html).toContain("Line one");
    expect(html).toContain("Line two **bold**");
    expect(html).not.toContain("<strong");
  });

  it("defaults the sidebar to open on desktop with a toggle control", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain('data-sidebar-state="open"');
    expect(html).toContain('data-control="sidebar-toggle"');
    expect(html).toMatch(/data-control="sidebar-toggle"[^>]*aria-expanded="true"/);
  });

  it("closes the sidebar immediately when opening a journal on mobile", async () => {
    const openConversation = jest.fn().mockResolvedValue(undefined);
    const closeSidebar = jest.fn();
    const push = jest.fn();

    mockUseLocalConversations.mockReturnValueOnce({
      conversations: [],
      activeConversationId: null,
      messages: [],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation,
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseResponsiveSidebar.mockReturnValueOnce({
      isDesktop: false,
      isSidebarOpen: true,
      closeSidebar,
      toggleSidebar: jest.fn(),
      openSidebar: jest.fn(),
      setIsSidebarOpen: jest.fn(),
    });
    mockUseRouter.mockReturnValueOnce({ replace: jest.fn(), push });

    renderToStaticMarkup(<ConversationPane />);

    const sidebarProps = mockConversationSidebar.mock.calls[0]?.[0];
    sidebarProps.onOpenConversation("conv-1");

    expect(closeSidebar).toHaveBeenCalledTimes(1);
    expect(openConversation).toHaveBeenCalledWith("conv-1");
    expect(push).toHaveBeenCalledWith("/journals/conv-1");
  });

  it("nudges empty journals toward the welcome guide", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain("Say your entry to get started.");
    expect(html).toContain('href="/welcome"');
  });

  it("builds journal hrefs for conversations", () => {
    expect(buildJournalHref("conv-1")).toBe("/journals/conv-1");
    expect(buildJournalHref("conv 2")).toBe("/journals/conv%202");
  });

  it("auto-saves homepage transcripts when flagged", () => {
    expect(
      shouldAutoSavePendingTranscript({
        transcript: "Saved from home",
        confidence: null,
        autoSave: true,
      })
    ).toBe(true);
    expect(
      shouldAutoSavePendingTranscript({
        transcript: "Review first",
        confidence: null,
      })
    ).toBe(false);
    expect(shouldAutoSavePendingTranscript(null)).toBe(false);
  });

});
