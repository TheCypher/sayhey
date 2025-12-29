import { renderToStaticMarkup } from "react-dom/server";

import { SiteNav } from "../site-nav";

describe("SiteNav", () => {
  it("renders Welcome and About links", () => {
    const html = renderToStaticMarkup(<SiteNav current="about" />);

    expect(html).toContain('data-nav="primary"');
    expect(html).toContain('href="/welcome"');
    expect(html).toContain(">Welcome<");
    expect(html).toContain('href="/about"');
    expect(html).toContain(">About<");
  });

  it("marks the active page", () => {
    const html = renderToStaticMarkup(<SiteNav current="about" />);

    expect(html).toMatch(
      /href="\/about"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/about"/
    );
  });

  it("links the brand title to a new journal", () => {
    const html = renderToStaticMarkup(<SiteNav current="welcome" />);

    expect(html).toMatch(/href="\/"[^>]*>Say hey<\/a>/);
    expect(html).toContain("text-[color:var(--page-accent-strong)]");
  });
});
