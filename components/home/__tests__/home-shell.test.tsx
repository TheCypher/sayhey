import { renderToStaticMarkup } from "react-dom/server";

import { useLocalConversations } from "@/hooks/use-local-conversations";
import { useResponsiveSidebar } from "@/hooks/use-responsive-sidebar";
import { useRouter } from "next/navigation";

import { ConversationSidebar } from "../../application/conversation-sidebar";
import { HomeShell } from "../home-shell";

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

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/use-local-conversations", () => ({
  useLocalConversations: jest.fn(),
}));

jest.mock("@/hooks/use-responsive-sidebar", () => ({
  useResponsiveSidebar: jest.fn(),
}));

jest.mock("@/components/application/conversation-sidebar", () => ({
  ConversationSidebar: jest.fn(() => null),
}));

jest.mock("@/components/home/home-spacebar-capture", () => ({
  HomeSpacebarCapture: jest.fn(() => null),
}));

describe("HomeShell", () => {
  const mockUseLocalConversations =
    useLocalConversations as jest.MockedFunction<typeof useLocalConversations>;
  const mockUseResponsiveSidebar =
    useResponsiveSidebar as jest.MockedFunction<typeof useResponsiveSidebar>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockConversationSidebar =
    ConversationSidebar as jest.MockedFunction<typeof ConversationSidebar>;

  beforeEach(() => {
    mockUseLocalConversations.mockReturnValue({
      conversations: [],
      activeConversationId: null,
      messages: [],
      renameConversation: jest.fn(),
      pinConversation: jest.fn(),
      archiveConversation: jest.fn(),
      deleteConversation: jest.fn(),
      isLoading: false,
      error: null,
      createConversation: jest.fn().mockResolvedValue("conv-1"),
      openConversation: jest.fn().mockResolvedValue(undefined),
      appendMessage: jest.fn().mockResolvedValue("conv-1"),
      updateMessage: jest.fn().mockResolvedValue(null),
      refresh: jest.fn().mockResolvedValue(undefined),
    });
    mockUseResponsiveSidebar.mockReturnValue({
      isDesktop: true,
      isSidebarOpen: true,
      closeSidebar: jest.fn(),
      toggleSidebar: jest.fn(),
    });
    mockUseRouter.mockReturnValue({ push: jest.fn() });
  });

  afterEach(() => {
    mockUseLocalConversations.mockReset();
    mockUseResponsiveSidebar.mockReset();
    mockUseRouter.mockReset();
    mockConversationSidebar.mockClear();
    mockNextLink.mockClear();
  });

  it("renders the account control instead of Account when authenticated", () => {
    const html = renderToStaticMarkup(
      <HomeShell
        isAuthenticated
        displayName="Ada Lovelace"
        accountLabel="Ada Lovelace"
      />
    );

    expect(html).toContain('data-control="account-link"');
    expect(html).toContain('data-role="account-initials"');
    expect(html).toContain(">AL<");
    expect(html).toContain('href="/account"');
    expect(html).not.toContain(">Log in<");
  });

  it("renders the centered hero headline and CTA", () => {
    const html = renderToStaticMarkup(<HomeShell />);

    expect(html).toContain("just speak.");
    expect(html).toContain("Start journaling");
    expect(html).toContain("Local-only, no cloud saving.");
  });
});
