import { renderToStaticMarkup } from "react-dom/server";

import { cookies } from "next/headers";

import { ConversationPane } from "@/components/application/conversation-pane";
import { getSessionIdentity } from "@/lib/auth/session-identity";

import NewJournalPage from "../page";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/auth/session-identity", () => ({
  getSessionIdentity: jest.fn(),
}));

jest.mock("@/components/application/conversation-pane", () => ({
  ConversationPane: jest.fn(() => <div data-layout="journal-canvas" />),
}));

describe("New journal page", () => {
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>;
  const mockGetSessionIdentity =
    getSessionIdentity as jest.MockedFunction<typeof getSessionIdentity>;
  const mockConversationPane = ConversationPane as jest.MockedFunction<
    typeof ConversationPane
  >;

  beforeEach(() => {
    mockCookies.mockResolvedValue({
      get: jest.fn(() => undefined),
    } as Awaited<ReturnType<typeof cookies>>);
    mockGetSessionIdentity.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the journal canvas without pre-creating a conversation", async () => {
    const element = await NewJournalPage();
    const html = renderToStaticMarkup(element);

    expect(mockConversationPane).toHaveBeenCalled();
    expect(html).toContain('data-layout="journal-canvas"');
    expect(html).toContain("--page-accent:#6fb09a");
    expect(html).toContain("--page-accent-strong:#1d554c");
    expect(html).not.toContain("Preparing your workspace");
  });
});
