import { POST } from "../route";
import { getBoltRouter } from "@/lib/bolt/router";
import { describeIntentAttachments } from "@/lib/services/intent-attachments";

jest.mock("@/lib/bolt/router", () => ({
  getBoltRouter: jest.fn(),
}));

jest.mock("@/lib/services/intent-attachments", () => ({
  describeIntentAttachments: jest.fn(),
}));

describe("POST /api/intent", () => {
  const mockGetBoltRouter = getBoltRouter as jest.MockedFunction<
    typeof getBoltRouter
  >;
  const mockDescribeIntentAttachments =
    describeIntentAttachments as jest.MockedFunction<
      typeof describeIntentAttachments
    >;
  let routeMock: jest.Mock;

  beforeEach(() => {
    routeMock = jest.fn().mockResolvedValue("I want to focus on my priorities.");
    mockGetBoltRouter.mockResolvedValue({
      route: routeMock,
    } as any);
    mockDescribeIntentAttachments.mockResolvedValue([]);
  });

  afterEach(() => {
    mockGetBoltRouter.mockReset();
    mockDescribeIntentAttachments.mockReset();
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

  it("hydrates attachment sources with image descriptions", async () => {
    mockDescribeIntentAttachments.mockResolvedValueOnce([
      {
        id: "2",
        description: "A student holding a notebook in a classroom.",
      },
    ]);

    const response = await POST(
      new Request("http://localhost/api/intent", {
        method: "POST",
        body: JSON.stringify({
          entry: "I feel scattered today.",
          sources: [
            { id: "1", type: "sentence", text: "I feel scattered today." },
            { id: "2", type: "attachment", text: "classroom.png" },
          ],
          attachments: [
            {
              id: "2",
              name: "classroom.png",
              dataUrl: "data:image/png;base64,abc",
            },
          ],
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.intent).toBe("I want to focus on my priorities.");
    expect(mockDescribeIntentAttachments).toHaveBeenCalledWith([
      {
        id: "2",
        name: "classroom.png",
        dataUrl: "data:image/png;base64,abc",
      },
    ]);
    expect(routeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          entry: "I feel scattered today.",
          sources: expect.arrayContaining([
            { id: "1", type: "sentence", text: "I feel scattered today." },
            {
              id: "2",
              type: "attachment",
              text: "classroom.png: A student holding a notebook in a classroom.",
            },
          ]),
        }),
      })
    );
  });
});
