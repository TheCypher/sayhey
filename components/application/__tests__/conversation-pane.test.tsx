import { renderToStaticMarkup } from "react-dom/server";

import { useLocalConversations } from "@/hooks/use-local-conversations";
import { useResponsiveSidebar } from "@/hooks/use-responsive-sidebar";
import { useTtsPlayback } from "@/hooks/use-tts-playback";
import { useVoiceCapture } from "@/hooks/use-voice-capture";
import { useRouter } from "next/navigation";

import { ConversationSidebar } from "../conversation-sidebar";
import {
  buildJournalHref,
  ConversationPane,
  getFooterVisibilityForScroll,
  getEntryRestoreSnapshot,
  getIntentCitationTargets,
  isEntryAttachmentTarget,
  parseIntentCitations,
  renderMarkdown,
  renderPlainText,
  shouldCommitEntryBlur,
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

jest.mock("@/hooks/use-voice-capture", () => ({
  useVoiceCapture: jest.fn(),
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
  const mockUseVoiceCapture = useVoiceCapture as jest.MockedFunction<
    typeof useVoiceCapture
  >;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockConversationSidebar =
    ConversationSidebar as jest.MockedFunction<typeof ConversationSidebar>;

  const buildVoiceCaptureReturn = (
    status: ReturnType<typeof useVoiceCapture>["status"]
  ): ReturnType<typeof useVoiceCapture> => ({
    status,
    transcript: "",
    confidence: null,
    error: null,
    startRecording: jest.fn().mockResolvedValue(undefined),
    pauseRecording: jest.fn(),
    resumeRecording: jest.fn(),
    stopRecording: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn(),
  });

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
      updateMessage: jest.fn().mockResolvedValue(null),
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
    mockUseVoiceCapture.mockReturnValue(buildVoiceCaptureReturn("idle"));
    mockUseRouter.mockReturnValue({ replace: jest.fn(), push: jest.fn() });
  });

  afterEach(() => {
    mockUseLocalConversations.mockReset();
    mockUseResponsiveSidebar.mockReset();
    mockUseTtsPlayback.mockReset();
    mockUseVoiceCapture.mockReset();
    mockUseRouter.mockReset();
    mockConversationSidebar.mockClear();
    mockNextLink.mockClear();
  });

  it("surfaces the spacebar commands near the composer", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain('data-pane="conversation"');
    expect(html).toContain("Main control:");
    expect(html).toMatch(
      /data-location="journal-footer"[\s\S]*Main control:\s*<strong[^>]*text-\[color:var\(--page-accent-strong\)\][^>]*>Spacebar<\/strong>/
    );
    expect(html).toMatch(
      /double-tap\s*<strong[^>]*text-\[color:var\(--page-accent-strong\)\][^>]*>Space<\/strong>\s*to stop and send[.,]/i
    );
  });

  it("shows the footer when scrolling up on mobile streams", () => {
    expect(
      getFooterVisibilityForScroll({
        current: 120,
        last: 140,
        clientHeight: 300,
        scrollHeight: 900,
      })
    ).toBe(true);
    expect(
      getFooterVisibilityForScroll({
        current: 120,
        last: 110,
        clientHeight: 300,
        scrollHeight: 900,
      })
    ).toBe(false);
  });

  it("keeps the footer visible near the edges of the stream", () => {
    expect(
      getFooterVisibilityForScroll({
        current: 8,
        last: 16,
        clientHeight: 300,
        scrollHeight: 900,
      })
    ).toBe(true);
    expect(
      getFooterVisibilityForScroll({
        current: 560,
        last: 520,
        clientHeight: 300,
        scrollHeight: 860,
      })
    ).toBe(true);
  });

  it("ignores tiny scroll changes in the footer visibility logic", () => {
    expect(
      getFooterVisibilityForScroll({
        current: 120,
        last: 116,
        clientHeight: 300,
        scrollHeight: 900,
      })
    ).toBeNull();
  });

  it("bolds the journal footer instructions and emphasizes the text entry toggle", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(
      /data-role="journal-instructions"[^>]*class="[^"]*hidden[^"]*font-semibold[^"]*sm:inline/
    );
    expect(html).toMatch(
      /<button(?=[^>]*data-control="composer-toggle")(?=[^>]*class="[^"]*rounded-full)(?=[^>]*class="[^"]*shadow-sm)[^>]*>Show text entry/
    );
  });

  it("keeps the footer divider aligned with the composer width", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(
      /data-location="journal-footer"[\s\S]*max-w-3xl[\s\S]*data-role="journal-footer-divider"/
    );
    expect(html).toMatch(
      /data-role="journal-footer-divider"[^>]*class="[^"]*w-full/
    );
    expect(html).toMatch(
      /data-role="journal-footer-divider"[\s\S]*data-control="composer"/
    );
  });

  it("highlights the text entry toggle with the journal accent color", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(
      /<button(?=[^>]*data-control="composer-toggle")(?=[^>]*class="[^"]*bg-\[color:var\(--page-accent-strong\)\])[^>]*>Show text entry/
    );
  });

  it("renders the journal navbar header with account and sidebar controls", () => {
    const html = renderToStaticMarkup(
      <ConversationPane displayName="Taylor" userEmail="hello@example.com" />
    );

    expect(html).toContain('data-control="sidebar-toggle"');
    expect(html).toContain('data-control="account-menu"');
    expect(html).toContain("Taylor");
    expect(html).toContain("JOURNAL");
    expect(html.indexOf('data-role="journal-title"')).toBeLessThan(
      html.indexOf('data-role="journal-user"')
    );
    expect(html.indexOf('data-role="journal-left"')).toBeLessThan(
      html.indexOf('data-role="journal-center"')
    );
    expect(html.indexOf('data-role="journal-center"')).toBeLessThan(
      html.indexOf('data-role="journal-right"')
    );
  });

  it("keeps the journal header compact and minimal", () => {
    const html = renderToStaticMarkup(
      <ConversationPane displayName="Taylor" userEmail="hello@example.com" />
    );

    expect(html).toMatch(/data-nav="journal"[\s\S]*border-b/);
    expect(html).not.toContain("Signed in");
    expect(html).toMatch(/data-location="journal-header"/);
    expect(html).toMatch(
      /data-location="journal-header"[\s\S]*data-control="sidebar-toggle"/
    );
    expect(html).toMatch(
      /data-location="journal-header"[\s\S]*data-role="journal-title"/
    );
    expect(html).toMatch(
      /data-location="journal-header"[\s\S]*data-role="journal-center"/
    );
    expect(html).toMatch(
      /data-location="journal-topbar"[\s\S]*flex-wrap/
    );
    expect(html).toMatch(
      /data-location="journal-topbar"[\s\S]*md:flex-nowrap/
    );
    expect(html).toMatch(
      /data-location="journal-topbar"[\s\S]*whitespace-normal/
    );
    expect(html).toMatch(
      /data-location="journal-topbar"[\s\S]*md:whitespace-nowrap/
    );
    expect(html).toMatch(
      /data-location="journal-topbar"[\s\S]*justify-center/
    );
    expect(html).toMatch(/data-location="journal-topbar"[\s\S]*w-full/);
  });

  it("stacks the journal header controls on small screens", () => {
    const html = renderToStaticMarkup(
      <ConversationPane displayName="Taylor" userEmail="hello@example.com" />
    );

    expect(html).toMatch(
      /data-role="journal-center"[^>]*class="[^"]*(?=[^"]*col-span-3)(?=[^"]*row-start-2)(?=[^"]*md:col-span-1)(?=[^"]*md:row-start-1)[^"]*"/
    );
  });

  it("shows compact spacebar guidance next to the mic button", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(/data-role="journal-shortcuts"/);
    expect(html).toMatch(
      /data-role="journal-shortcuts"[^>]*class="[^"]*(?=[^"]*hidden)(?=[^"]*md:flex)[^"]*"/
    );
    expect(html).toMatch(/Spacebar/);
    expect(html).toMatch(/double-tap/);
    expect(html).toMatch(/Show text entry/);
  });

  it("colors the Talk button by mic state", () => {
    mockUseVoiceCapture.mockReturnValue(buildVoiceCaptureReturn("idle"));
    let html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(
      /data-control="mic"[^>]*class="[^"]*bg-\[color:var\(--talk-waiting-bg\)\]/
    );

    mockUseVoiceCapture.mockReturnValue(buildVoiceCaptureReturn("recording"));
    html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(
      /data-control="mic"[^>]*class="[^"]*bg-\[color:var\(--talk-listening-bg\)\]/
    );

    mockUseVoiceCapture.mockReturnValue(buildVoiceCaptureReturn("paused"));
    html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(
      /data-control="mic"[^>]*class="[^"]*bg-\[color:var\(--talk-paused-bg\)\]/
    );

    mockUseVoiceCapture.mockReturnValue(buildVoiceCaptureReturn("processing"));
    html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(
      /data-control="mic"[^>]*class="[^"]*bg-\[color:var\(--talk-processing-bg\)\]/
    );
  });

  it("places the journal header inside the journal navbar", () => {
    const html = renderToStaticMarkup(
      <ConversationPane displayName="Taylor" userEmail="hello@example.com" />
    );

    expect(html).toMatch(/data-nav="journal"/);
    expect(html).toMatch(
      /data-nav="journal"[\s\S]*data-location="journal-header"/
    );
    expect(html).toMatch(
      /data-location="journal-header"[\s\S]*data-location="journal-topbar"/
    );
  });

  it("hides audio queue controls until playback activates", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).not.toContain("No queued audio");
    expect(html).not.toContain('data-control="stop-audio"');
  });

  it("shows audio queue controls after playback activates", () => {
    mockUseTtsPlayback.mockReturnValueOnce({
      status: "playing",
      queue: [],
      error: null,
      currentItem: null,
      enqueue: jest.fn(),
      clear: jest.fn(),
    });

    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain("No queued audio");
    expect(html).toContain('data-control="stop-audio"');
  });

  it("surfaces the account menu links when opened", () => {
    const html = renderToStaticMarkup(
      <ConversationPane
        displayName="Taylor"
        userEmail="hello@example.com"
        initialAccountMenuOpen
      />
    );

    expect(html).toContain('data-control="account-menu"');
    expect(html).toContain('href="/welcome"');
    expect(html).toContain('href="/account"');
    expect(html).toContain('href="/auth/logout"');
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

  it("moves the text entry toggle into the journal footer", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(
      /data-location="journal-footer"[\s\S]*Show text entry/
    );
    expect(html).toMatch(
      /data-location="journal-footer"[\s\S]*<div class="[^"]*(?=[^"]*max-w-3xl)(?=[^"]*px-1)(?=[^"]*py-\[1px\])[^"]*"/
    );
    expect(html).toMatch(/data-location="journal-footer"[\s\S]*text-center/);
    expect(html).not.toContain(
      "Secondary to voice. Open to add an entry or direct command."
    );
  });

  it("keeps the voice controls in the journal navbar above the stream", () => {
    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    const controlsIndex = html.indexOf('data-nav="journal"');
    const streamIndex = html.indexOf('data-stream="messages"');

    expect(html).toMatch(
      /data-location="journal-header"[\s\S]*data-pane="voice-controls"/
    );
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
      updateMessage: jest.fn().mockResolvedValue(null),
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
      updateMessage: jest.fn().mockResolvedValue(null),
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

  it("adds an intent control for user entries only", () => {
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
      updateMessage: jest.fn().mockResolvedValue(null),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    const matches = html.match(/data-control="entry-intent"/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(html).toMatch(
      /<button(?=[^>]*data-control="entry-intent")(?=[^>]*data-message-id="msg-1")[^>]*>Intent/
    );
  });

  it("renders saved intents with a delete control", () => {
    mockUseLocalConversations.mockReturnValueOnce({
      conversations: [],
      activeConversationId: "conv-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "Hello",
          intent: "I want to feel grounded before class.",
          createdAt: 1700000000000,
        },
      ],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      updateMessage: jest.fn().mockResolvedValue(null),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    expect(html).toContain("I want to feel grounded before class.");
    expect(html).toContain('data-control="intent-delete"');
    expect(html).toContain(
      'space-y-2 rounded-sm border border-[color:var(--page-border)] bg-[color:var(--page-card)] p-4 text-sm text-[color:var(--page-ink-strong)] shadow-sm shadow-black/5'
    );
  });

  it("renders intent citations as interactive markers", () => {
    mockUseLocalConversations.mockReturnValueOnce({
      conversations: [],
      activeConversationId: "conv-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "First sentence. Second sentence.",
          intent: "I want to slow down and focus. [1]",
          intentSources: [{ id: "1", type: "sentence", sentenceIndex: 0 }],
          createdAt: 1700000000000,
        },
      ],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      updateMessage: jest.fn().mockResolvedValue(null),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    expect(html).toContain('data-intent-citation="true"');
    expect(html).toContain('data-citation-id="1"');
  });

  it("renders inline editable entries with an editor-style toolbar", () => {
    mockUseLocalConversations.mockReturnValueOnce({
      conversations: [],
      activeConversationId: "conv-1",
      messages: [
        {
          id: "msg-1",
          role: "user",
          content: "Editable entry",
          createdAt: 1700000000000,
        },
        {
          id: "msg-2",
          role: "assistant",
          content: "Read-only reply",
          createdAt: 1700000001000,
        },
      ],
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      updateMessage: jest.fn().mockResolvedValue(null),
      renameConversation: jest.fn().mockResolvedValue(undefined),
      pinConversation: jest.fn().mockResolvedValue(undefined),
      archiveConversation: jest.fn().mockResolvedValue(undefined),
      deleteConversation: jest.fn().mockResolvedValue(undefined),
      refresh: jest.fn().mockResolvedValue(undefined),
    });

    const html = renderToStaticMarkup(
      <ConversationPane initialView="history" />
    );

    const editableMatches = html.match(/data-entry-editable="true"/g) ?? [];
    expect(editableMatches).toHaveLength(1);
    expect(html).toMatch(/contenteditable="true"/i);
    expect(html).toContain('data-role="entry-toolbar"');
    expect(html).toContain('data-variant="editor-toolbar"');
    expect(html).toContain(
      "flex w-full items-center gap-1 rounded-sm border border-[color:var(--page-border)] bg-[color:var(--page-paper)] px-2 text-[11px] text-[color:var(--page-muted)] shadow-sm shadow-black/5 transition-all duration-150"
    );
    expect(html).toContain('data-control="entry-undo"');
    expect(html).toContain('data-control="entry-restore"');
    expect(html).toContain(">Undo<");
    expect(html).toContain(">Restore<");
    expect(html).toContain('data-entry-id="msg-1"');
    expect(html).toContain(
      "rounded-sm border border-transparent px-3 py-2 text-base leading-7 text-[color:var(--page-ink-strong)] transition-colors"
    );
  });

  it("locks entry attachments against drag moves", () => {
    const attachmentTarget = {
      closest: (selector: string) =>
        selector === '[data-entry-attachment-id]' ? {} : null,
    };
    const nonAttachmentTarget = {
      closest: () => null,
    };

    expect(
      isEntryAttachmentTarget(attachmentTarget as unknown as EventTarget)
    ).toBe(true);
    expect(
      isEntryAttachmentTarget(nonAttachmentTarget as unknown as EventTarget)
    ).toBe(false);
    expect(isEntryAttachmentTarget(null)).toBe(false);
  });

  it("restores entry content from the active snapshot", () => {
    const message = {
      id: "msg-1",
      role: "user",
      content: "Saved entry",
      createdAt: 1700000000000,
    };
    const snapshot = {
      messageId: "msg-1",
      content: "Original entry",
      attachments: [],
    };

    expect(getEntryRestoreSnapshot(message, snapshot)).toEqual(snapshot);
  });

  it("falls back to message content when no restore snapshot exists", () => {
    const message = {
      id: "msg-2",
      role: "user",
      content: "Saved entry",
      createdAt: 1700000000000,
      attachments: [
        {
          id: "att-1",
          name: "Image",
          mimeType: "image/png",
          dataUrl: "data:image/png;base64,abc",
          position: 1,
        },
      ],
    };

    expect(getEntryRestoreSnapshot(message, null)).toEqual({
      messageId: "msg-2",
      content: "Saved entry",
      attachments: [
        {
          id: "att-1",
          name: "Image",
          mimeType: "image/png",
          dataUrl: "data:image/png;base64,abc",
          position: 1,
        },
      ],
    });
  });

  it("saves entries only after focus leaves the entry wrapper", () => {
    const inside = {};
    const outside = {};
    const currentTarget = {
      contains: (node: unknown) => node === inside,
    };

    expect(
      shouldCommitEntryBlur(
        currentTarget as unknown as HTMLElement,
        inside as unknown as Node,
        null
      )
    ).toBe(false);
    expect(
      shouldCommitEntryBlur(
        currentTarget as unknown as HTMLElement,
        null,
        inside as unknown as Node
      )
    ).toBe(false);
    expect(
      shouldCommitEntryBlur(
        currentTarget as unknown as HTMLElement,
        null,
        outside as unknown as Node
      )
    ).toBe(true);
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
      updateMessage: jest.fn().mockResolvedValue(null),
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
      updateMessage: jest.fn().mockResolvedValue(null),
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
      updateMessage: jest.fn().mockResolvedValue(null),
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

  it("adds paragraph indices for citation highlights", () => {
    const html = renderToStaticMarkup(
      <div>{renderMarkdown("First paragraph.\n\nSecond paragraph.")}</div>
    );

    const matches = html.match(/data-paragraph-index/g) ?? [];
    expect(matches).toHaveLength(2);
    expect(html).toContain('data-paragraph-index="0"');
    expect(html).toContain('data-paragraph-index="1"');
  });

  it("parses intent citations into tokens", () => {
    const tokens = parseIntentCitations("Stay calm. [1] Keep moving.", [
      { id: "1", type: "sentence", sentenceIndex: 0 },
    ]);

    const citationTokens = tokens.filter((token) => token.type === "citation");
    expect(citationTokens).toHaveLength(1);
    expect(citationTokens[0]).toMatchObject({ id: "1" });
  });

  it("maps citation ids to highlight targets", () => {
    const targets = getIntentCitationTargets(
      [
        { id: "1", type: "sentence", sentenceIndex: 2 },
        { id: "2", type: "paragraph", paragraphIndex: 1 },
        { id: "3", type: "attachment", attachmentId: "att-1" },
      ],
      "2"
    );

    expect(targets).not.toBeNull();
    expect(targets?.paragraphIndices.has(1)).toBe(true);
    expect(targets?.sentenceIndices.size).toBe(0);
    expect(targets?.attachmentIds.size).toBe(0);
  });

  it("renders plain text without markdown formatting", () => {
    const html = renderToStaticMarkup(
      <div>{renderPlainText("Line one\nLine two **bold**")}</div>
    );

    expect(html).toContain("Line one");
    expect(html).toContain("Line two **bold**");
    expect(html).not.toContain("<strong");
  });

  it("defaults the sidebar to open on desktop", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toContain('data-sidebar-state="open"');
    expect(html).toContain('data-control="sidebar-toggle"');
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
      updateMessage: jest.fn().mockResolvedValue(null),
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
