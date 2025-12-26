import { renderToStaticMarkup } from "react-dom/server";

import Home from "../page";

describe("Home page", () => {
  it("renders the conversation pane shell", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('data-pane="conversation"');
    expect(html).toContain('data-control="composer-toggle"');
    expect(html).toContain('data-control="composer"');
    expect(html).toMatch(/data-control="composer"[^>]*hidden/);
    expect(html).toContain("Voice journal");
    expect(html).not.toContain("Agent Conversation");
  });

  it("shows the conversation stream empty state", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('data-stream="messages"');
    expect(html).toContain("Say your entry to get started.");
  });
});
