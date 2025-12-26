import { renderToStaticMarkup } from "react-dom/server";

import { ConversationPane } from "../conversation-pane";

describe("ConversationPane", () => {
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

  it("moves the text entry toggle into the journal header", () => {
    const html = renderToStaticMarkup(<ConversationPane />);

    expect(html).toMatch(
      /data-location="journal-header"[\s\S]*Show text entry/
    );
    expect(html).not.toContain(
      "Secondary to voice. Open to add an entry or direct command."
    );
  });
});
