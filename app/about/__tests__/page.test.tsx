import { renderToStaticMarkup } from "react-dom/server";

import AboutPage from "../page";

describe("About page", () => {
  it("renders the hero narrative", () => {
    const html = renderToStaticMarkup(<AboutPage />);

    expect(html).toContain('data-about="page"');
    expect(html).toContain("Who We Are &amp; What We Stand For");
    expect(html).toContain(
      "We are building technology for people, not for platforms."
    );
  });

  it("highlights privacy and trust commitments", () => {
    const html = renderToStaticMarkup(<AboutPage />);

    expect(html).toContain("Privacy First - By Design");
    expect(html).toContain("We do not host your information.");
    expect(html).toContain(
      "We cannot misuse your data because we do not have it."
    );
  });
});
