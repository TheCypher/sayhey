import { renderToStaticMarkup } from "react-dom/server";

import { useLocalConversations } from "../use-local-conversations";

const LoadingProbe = () => {
  const { isLoading } = useLocalConversations();
  return <div data-loading={isLoading ? "true" : "false"} />;
};

describe("useLocalConversations", () => {
  it("defaults to loading during SSR to avoid hydration mismatches", () => {
    const html = renderToStaticMarkup(<LoadingProbe />);

    expect(html).toContain('data-loading="true"');
  });
});
