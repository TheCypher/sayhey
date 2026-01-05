import { renderToStaticMarkup } from "react-dom/server";

import { useVoiceCapture } from "@/hooks/use-voice-capture";
import { useRouter } from "next/navigation";

import { HomeSpacebarCapture } from "../home-spacebar-capture";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/hooks/use-voice-capture", () => ({
  useVoiceCapture: jest.fn(),
}));

describe("HomeSpacebarCapture", () => {
  const mockUseVoiceCapture = useVoiceCapture as jest.MockedFunction<
    typeof useVoiceCapture
  >;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  const buildVoiceCaptureReturn = (
    status: ReturnType<typeof useVoiceCapture>["status"]
  ): ReturnType<typeof useVoiceCapture> => ({
    status,
    transcript: "",
    confidence: null,
    error: null,
    startRecording: jest.fn().mockResolvedValue(undefined),
    pauseRecording: jest.fn(),
    resumeRecording: jest.fn(),
    stopRecording: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn(),
  });

  beforeEach(() => {
    mockUseVoiceCapture.mockReturnValue(buildVoiceCaptureReturn("idle"));
    mockUseRouter.mockReturnValue({ push: jest.fn() });
  });

  afterEach(() => {
    mockUseVoiceCapture.mockReset();
    mockUseRouter.mockReset();
  });

  it("colors the Talk button by capture state", () => {
    mockUseVoiceCapture.mockReturnValue(buildVoiceCaptureReturn("idle"));
    let html = renderToStaticMarkup(<HomeSpacebarCapture />);

    expect(html).toMatch(
      /class="[^"]*bg-\[color:var\(--talk-waiting-bg\)\][^"]*"/
    );

    mockUseVoiceCapture.mockReturnValue(buildVoiceCaptureReturn("recording"));
    html = renderToStaticMarkup(<HomeSpacebarCapture />);

    expect(html).toMatch(
      /class="[^"]*bg-\[color:var\(--talk-listening-bg\)\][^"]*"/
    );

    mockUseVoiceCapture.mockReturnValue(buildVoiceCaptureReturn("paused"));
    html = renderToStaticMarkup(<HomeSpacebarCapture />);

    expect(html).toMatch(
      /class="[^"]*bg-\[color:var\(--talk-paused-bg\)\][^"]*"/
    );

    mockUseVoiceCapture.mockReturnValue(buildVoiceCaptureReturn("processing"));
    html = renderToStaticMarkup(<HomeSpacebarCapture />);

    expect(html).toMatch(
      /class="[^"]*bg-\[color:var\(--talk-processing-bg\)\][^"]*"/
    );
  });
});
