import { renderToStaticMarkup } from "react-dom/server";

import { OnboardingFlow } from "../onboarding-flow";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
}));

describe("Onboarding flow", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("starts with the terms confirmation step", () => {
    const html = renderToStaticMarkup(
      <OnboardingFlow email="hello@example.com" />
    );

    expect(html).toContain("Let&#x27;s create your account");
    expect(html).toContain("I agree");
    expect(html).toContain("Continue");
    expect(html).toContain("animate-fade-up flex justify-center");
  });

  it("shows a back control after the first step", () => {
    const html = renderToStaticMarkup(
      <OnboardingFlow email="hello@example.com" initialStep={1} />
    );

    expect(html).toContain("Step 2 of 5");
    expect(html).toContain(">Back<");
  });

  it("matches the pricing page plan copy", () => {
    const html = renderToStaticMarkup(
      <OnboardingFlow email="hello@example.com" initialStep={2} />
    );

    expect(html).toContain("Free");
    expect(html).toContain("Pro");
    expect(html).toContain("Coming soon");
    expect(html).toContain(
      "Push-to-talk voice journaling with Spacebar control."
    );
    expect(html).toContain("Higher daily capture limits.");
    expect(html).not.toContain("Max");
  });
});
