import { POST } from "../route";
import { getBoltRouter } from "@/lib/bolt/router";

jest.mock("@/lib/bolt/router", () => ({
  getBoltRouter: jest.fn(),
}));

describe("POST /api/chat/turns", () => {
  const mockGetBoltRouter = getBoltRouter as jest.MockedFunction<
    typeof getBoltRouter
  >;

  beforeEach(() => {
    mockGetBoltRouter.mockResolvedValue({
      route: jest.fn().mockResolvedValue({ assistantMessage: "Hello" }),
    } as any);
  });

  afterEach(() => {
    mockGetBoltRouter.mockReset();
  });

  it("returns 400 when message is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat/turns", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing message");
  });

  it("allows low-confidence voice turns but suppresses field updates", async () => {
    const routeMock = jest.fn().mockResolvedValue({
      assistantMessage: "Hello",
      fieldUpdateResults: [{ id: "field-1" }],
    });
    mockGetBoltRouter.mockResolvedValueOnce({
      route: routeMock,
    } as any);

    const response = await POST(
      new Request("http://localhost/api/chat/turns", {
        method: "POST",
        body: JSON.stringify({
          message: "Can you confirm I own 100%?",
          agentId: "helper",
          inputType: "voice",
          transcriptConfidence: 0.5,
          conversationHistory: [],
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.uncertainTranscript).toBe(true);
    expect(data.assistantMessage).toBe("Hello");
    expect(data.fieldUpdateResults).toEqual([]);
    expect(routeMock).toHaveBeenCalled();
  });

  it("returns assistant response on explicit request", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat/turns", {
        method: "POST",
        body: JSON.stringify({
          message: "Can you help me?",
          agentId: "helper",
          inputType: "text",
          conversationHistory: [],
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assistantMessage).toBe("Hello");
  });

  it("skips replies when no explicit request is detected", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat/turns", {
        method: "POST",
        body: JSON.stringify({
          message: "Thinking through next steps on my own",
          agentId: "helper",
          inputType: "voice",
          transcriptConfidence: 0.9,
          conversationHistory: [],
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ignored).toBe(true);
    expect(mockGetBoltRouter).not.toHaveBeenCalled();
  });
});
