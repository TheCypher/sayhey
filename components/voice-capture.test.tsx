import { renderToStaticMarkup } from "react-dom/server";

import { useTranscriptionPipeline } from "@/hooks/use-transcription-pipeline";

import { VoiceCapture } from "./voice-capture";

jest.mock("@/hooks/use-transcription-pipeline", () => ({
  useTranscriptionPipeline: jest.fn(),
}));

describe("VoiceCapture", () => {
  const mockUseTranscriptionPipeline =
    useTranscriptionPipeline as jest.MockedFunction<
      typeof useTranscriptionPipeline
    >;

  beforeEach(() => {
    mockUseTranscriptionPipeline.mockReturnValue({
      status: "idle",
      segments: [],
    });
  });

  afterEach(() => {
    mockUseTranscriptionPipeline.mockReset();
  });

  it("renders idle state copy and CTA", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="idle" />
    );

    expect(html).toContain("Tap to speak");
    expect(html).toContain("Listening status: idle");
  });

  it("renders active state labels and controls", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="active" />
    );

    expect(html).toContain("Listening...");
    expect(html).toContain("Pause");
    expect(html).toContain("Close entry");
    expect(html).toContain("Listening status: active");
  });

  it("defers transcript display while listening", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="active" />
    );

    expect(html).toContain(
      "Transcript appears after you pause or close the entry."
    );
  });

  it("renders paused state labels and controls", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="paused" />
    );

    expect(html).toContain("Continue entry");
    expect(html).toContain("Close entry");
    expect(html).toContain("Listening status: paused");
  });

  it("shows transcript segments when paused", () => {
    mockUseTranscriptionPipeline.mockReturnValue({
      status: "idle",
      segments: [{ id: "segment-1", text: "Paused transcript" }],
    });

    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="paused" />
    );

    expect(html).toContain("Paused transcript");
  });

  it("treats requesting as listening for immediate feedback", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="requesting" />
    );

    expect(html).toContain("Listening...");
  });

  it("marks the CTA as listening when requesting mic access", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="requesting" />
    );

    expect(html).toContain('data-listening="true"');
  });

  it("prevents ring layers from blocking pointer events", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="idle" />
    );

    expect(html).toContain("pointer-events-none");
  });

  it("renders a scrollable journal entry stream", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="idle" />
    );

    expect(html).toContain('data-stream="entry"');
    expect(html).toContain("overflow-y-auto");
  });

  it("renders listening controls in a dedicated control bar", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="active" />
    );

    expect(html).toContain('data-control="pause"');
    expect(html).toContain('data-control="stop"');
  });

  it("avoids duplicating start/resume controls", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="paused" />
    );

    expect(html).toContain("Continue entry");
  });

  it("renders closed entry state copy", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="stopped" />
    );

    expect(html).toContain("Tap to speak");
    expect(html).toContain("Listening status: closed");
  });

  it("surfaces a calm message when the microphone is blocked", () => {
    const html = renderToStaticMarkup(
      <VoiceCapture initialAudioStatus="blocked" />
    );

    expect(html).toContain("Microphone access is needed to listen.");
  });
});
