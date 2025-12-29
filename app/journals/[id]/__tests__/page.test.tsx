import { renderToStaticMarkup } from "react-dom/server";

import { useRouter, useSearchParams } from "next/navigation";

import JournalPage from "../page";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

describe("Journal page", () => {
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<
    typeof useSearchParams
  >;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockUseRouter.mockReturnValue({ replace: jest.fn(), push: jest.fn() });
  });

  afterEach(() => {
    mockUseSearchParams.mockReset();
    mockUseRouter.mockReset();
  });

  it("renders the full-width journal canvas for routed journals", async () => {
    const element = await JournalPage({
      params: Promise.resolve({ id: "conv-1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('data-layout="journal-canvas"');
    expect(html).not.toContain('data-nav="primary"');
  });
});
