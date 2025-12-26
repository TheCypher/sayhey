import { viewport } from "../layout";

describe("Root layout", () => {
  it("sets a device-width viewport for responsive layouts", () => {
    expect(viewport?.width).toBe("device-width");
    expect(viewport?.initialScale).toBe(1);
  });
});
