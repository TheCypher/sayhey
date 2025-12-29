import { renderToStaticMarkup } from "react-dom/server";

import { useRouter } from "next/navigation";

import Home from "../page";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("Home page", () => {
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    mockUseRouter.mockReturnValue({ push: jest.fn(), replace: jest.fn() });
  });

  afterEach(() => {
    mockUseRouter.mockReset();
  });

  it("renders the landing hero", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('data-page="home"');
    expect(html).toContain('data-layout="home-split"');
    expect(html).toContain('data-section="home-hero"');
    expect(html).toContain("Don&#x27;t type,");
    expect(html).toContain("just speak.");
    expect(html).toContain("Start journaling");
    expect(html).toContain("Space to talk");
    expect(html).toContain("double-tap to stop");
  });

  it("renders the landing navigation", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('data-nav="landing"');
    expect(html).toContain('data-control="sidebar-toggle"');
    expect(html).toContain("Say hey");
    expect(html).toContain("Home");
    expect(html).toContain("Welcome");
    expect(html).toContain("About");
  });

  it("defaults the homepage sidebar to open on desktop", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('data-sidebar-state="open"');
    expect(html).toMatch(
      /data-control="sidebar-toggle"[^>]*aria-expanded="true"/
    );
  });

  it("includes the home voice controls", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('data-control="home-voice-controls"');
    expect(html).toContain('data-section="home-voice-card"');
  });

  it("renders the orbiting home accent", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('data-animation="home-orbit"');
    expect(html).toContain('data-orbit="hero"');
    expect(html).toContain('data-orbit-size="2xl"');
    expect(html).toContain('attributeName="startOffset"');
  });

  it("seeds the orbit accent with variant, direction, and timing defaults on the server render", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('data-orbit-variant="swoop-left-high"');
    expect(html).toContain('data-orbit-direction="ltr"');
    expect(html).toContain('startOffset="0%"');
    expect(html).toMatch(/dur="\d+s"/);
  });
});
