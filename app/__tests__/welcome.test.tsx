import { renderToStaticMarkup } from "react-dom/server";

import WelcomePage from "../welcome/page";

describe("Welcome page", () => {
  it("renders the welcome tour panel", () => {
    const html = renderToStaticMarkup(<WelcomePage />);

    expect(html).toContain('data-state="welcome"');
    expect(html).toContain("Welcome to Hey");
    expect(html).toContain("Quick tour");
    expect(html).toContain("Our philosophy");
  });

  it("includes navigation and start CTA", () => {
    const html = renderToStaticMarkup(<WelcomePage />);

    expect(html).toContain('data-nav="primary"');
    expect(html).toContain("Welcome");
    expect(html).toContain("About");
    expect(html).toMatch(/href="\/journals\/new"[^>]*>Start a journal</);
    expect(html).toMatch(/href="\/"[^>]*>Back home</);
  });
});
