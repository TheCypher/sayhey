import { renderToStaticMarkup } from "react-dom/server";

import { SiteNav } from "../site-nav";

describe("SiteNav", () => {
  it("renders Home and About links", () => {
    const html = renderToStaticMarkup(<SiteNav current="about" />);

    expect(html).toContain('data-nav="primary"');
    expect(html).toContain('href="/"');
    expect(html).toContain(">Home<");
    expect(html).toContain('href="/about"');
    expect(html).toContain(">About<");
  });

  it("marks the active page", () => {
    const html = renderToStaticMarkup(<SiteNav current="about" />);

    expect(html).toMatch(
      /href="\/about"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/about"/
    );
  });

  it("links the brand title to home", () => {
    const html = renderToStaticMarkup(<SiteNav current="home" />);

    expect(html).toMatch(/href="\/\?new=1"[^>]*>Hey<\/a>/);
  });
});
