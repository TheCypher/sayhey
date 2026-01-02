import { GET } from "../route";

describe("GET /auth/logout", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://sayhey.local";
  });

  afterEach(() => {
    delete process.env.APP_URL;
  });

  it("clears the session cookie and redirects to /auth", async () => {
    const response = await GET(new Request("https://sayhey.local/auth/logout"));

    expect(response.headers.get("location")).toBe(
      "https://sayhey.local/auth"
    );
    expect(response.headers.get("set-cookie")).toContain("sayhey_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
