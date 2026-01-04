import { renderToStaticMarkup } from "react-dom/server";

import { SiteNav } from "../site-nav";

describe("SiteNav", () => {
  it("renders Pricing, Welcome, About, and Login links", () => {
    const html = renderToStaticMarkup(<SiteNav current="about" />);

    expect(html).toContain('data-nav="primary"');
    expect(html).toContain('href="/pricing"');
    expect(html).toContain(">Pricing<");
    expect(html).toContain('href="/welcome"');
    expect(html).toContain(">Welcome<");
    expect(html).toContain('href="/about"');
    expect(html).toContain(">About<");
    expect(html).toContain('href="/auth"');
    expect(html).toContain(">Login<");
  });

  it("renders the account control instead of Login when authenticated", () => {
    const html = renderToStaticMarkup(
      <SiteNav current="about" isAuthenticated accountLabel="Ada Lovelace" />
    );

    expect(html).toContain('data-control="account-link"');
    expect(html).toContain('data-role="account-initials"');
    expect(html).toContain(">AL<");
    expect(html).toContain('href="/account"');
    expect(html).not.toContain(">Login<");
  });

  it("renders the mobile menu trigger", () => {
    const html = renderToStaticMarkup(<SiteNav current="about" />);

    expect(html).toContain(">Menu<");
  });

  it("marks the active page", () => {
    const html = renderToStaticMarkup(<SiteNav current="about" />);

    expect(html).toMatch(
      /href="\/about"[^>]*aria-current="page"|aria-current="page"[^>]*href="\/about"/
    );
  });

  it("links the brand title to a new journal", () => {
    const html = renderToStaticMarkup(<SiteNav current="welcome" />);

    expect(html).toContain('href="/"');
    expect(html).toContain("Say hey");
    expect(html).toContain("text-[color:var(--brand-accent-strong)]");
  });
});
