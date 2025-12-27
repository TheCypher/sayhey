import {
  parseStoredSidebarState,
  readStoredSidebarState,
  resolveSidebarOpen,
  writeStoredSidebarState,
} from "../use-responsive-sidebar";

const createStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
};

describe("useResponsiveSidebar helpers", () => {
  it("parses stored sidebar state values", () => {
    expect(parseStoredSidebarState("open")).toBe(true);
    expect(parseStoredSidebarState("closed")).toBe(false);
    expect(parseStoredSidebarState("true")).toBe(true);
    expect(parseStoredSidebarState("false")).toBe(false);
    expect(parseStoredSidebarState("unknown")).toBeNull();
    expect(parseStoredSidebarState(null)).toBeNull();
  });

  it("reads persisted state from storage", () => {
    const storage = createStorage();
    storage.setItem("sidebar", "open");
    expect(readStoredSidebarState(storage, "sidebar")).toBe(true);
    storage.setItem("sidebar", "closed");
    expect(readStoredSidebarState(storage, "sidebar")).toBe(false);
    storage.setItem("sidebar", "nope");
    expect(readStoredSidebarState(storage, "sidebar")).toBeNull();
  });

  it("resolves to the stored value on desktop", () => {
    expect(
      resolveSidebarOpen({ isDesktop: true, storedState: true, defaultOpen: false })
    ).toBe(true);
    expect(
      resolveSidebarOpen({ isDesktop: true, storedState: false, defaultOpen: true })
    ).toBe(false);
    expect(
      resolveSidebarOpen({ isDesktop: true, storedState: null, defaultOpen: false })
    ).toBe(false);
  });

  it("always closes on mobile regardless of stored state", () => {
    expect(
      resolveSidebarOpen({ isDesktop: false, storedState: true, defaultOpen: true })
    ).toBe(false);
  });

  it("writes open and closed values to storage", () => {
    const storage = createStorage();
    writeStoredSidebarState(storage, "sidebar", true);
    expect(storage.getItem("sidebar")).toBe("open");
    writeStoredSidebarState(storage, "sidebar", false);
    expect(storage.getItem("sidebar")).toBe("closed");
  });
});
