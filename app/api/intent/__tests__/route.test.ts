import { POST } from "../route";
import { getBoltRouter } from "@/lib/bolt/router";

jest.mock("@/lib/bolt/router", () => ({
  getBoltRouter: jest.fn(),
}));

describe("POST /api/intent", () => {
  const mockGetBoltRouter = getBoltRouter as jest.MockedFunction<
    typeof getBoltRouter
  >;

  beforeEach(() => {
    mockGetBoltRouter.mockResolvedValue({
      route: jest.fn().mockResolvedValue("I want to focus on my priorities."),
    } as any);
  });

  afterEach(() => {
    mockGetBoltRouter.mockReset();
  });

  it("returns 400 when entry is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/intent", {
        method: "POST",
        body: JSON.stringify({ entry: "" }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing entry");
  });

  it("returns intent when the router responds", async () => {
    const response = await POST(
      new Request("http://localhost/api/intent", {
        method: "POST",
        body: JSON.stringify({ entry: "I feel scattered today." }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.intent).toBe("I want to focus on my priorities.");
  });

  it("returns 502 when routing fails", async () => {
    mockGetBoltRouter.mockResolvedValueOnce({
      route: jest.fn().mockRejectedValue(new Error("boom")),
    } as any);

    const response = await POST(
      new Request("http://localhost/api/intent", {
        method: "POST",
        body: JSON.stringify({ entry: "I feel scattered today." }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toBe("Intent request failed");
  });
});
