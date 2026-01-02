import { renderToStaticMarkup } from "react-dom/server";

import { AuthForm } from "../auth-form";

describe("AuthForm", () => {
  it("renders the email field and submit button", () => {
    const html = renderToStaticMarkup(<AuthForm />);

    expect(html).toContain('type="email"');
    expect(html).toContain("Continue with email");
  });
});
