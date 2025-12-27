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
});
