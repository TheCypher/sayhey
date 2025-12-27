import { renderToStaticMarkup } from "react-dom/server";

import { useRouter, useSearchParams } from "next/navigation";

import Home from "../page";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("Home page", () => {
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<
    typeof useSearchParams
  >;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseRouter.mockReturnValue({ replace: jest.fn() });
  });

  afterEach(() => {
    mockUseSearchParams.mockReset();
    mockUseRouter.mockReset();
  });

  it("renders the conversation pane shell", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('data-pane="conversation"');
    expect(html).toContain('data-control="composer-toggle"');
    expect(html).toContain('data-control="composer"');
    expect(html).toMatch(/data-control="composer"[^>]*hidden/);
    expect(html).toContain("Voice journal");
    expect(html).not.toContain("Agent Conversation");
  });

  it("shows the conversation stream loading state", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('data-stream="messages"');
    expect(html).toContain("Loading your journal history...");
  });
});
