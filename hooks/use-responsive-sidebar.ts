"use client";

import { useCallback, useEffect, useState } from "react";

type StoredState = boolean | null;

const DESKTOP_MEDIA_QUERY = "(min-width: 768px)";
const SIDEBAR_STORAGE_KEY = "hey:sidebar-open";

export const parseStoredSidebarState = (value: string | null): StoredState => {
  if (value === "open" || value === "true") {
    return true;
  }
  if (value === "closed" || value === "false") {
    return false;
  }
  return null;
};

export const readStoredSidebarState = (
  storage: Pick<Storage, "getItem"> | null,
  key: string
): StoredState => {
  if (!storage) {
    return null;
  }
  return parseStoredSidebarState(storage.getItem(key));
};

export const writeStoredSidebarState = (
  storage: Pick<Storage, "setItem"> | null,
  key: string,
  isOpen: boolean
) => {
  if (!storage) {
    return;
  }
  storage.setItem(key, isOpen ? "open" : "closed");
};

export const resolveSidebarOpen = (options: {
  isDesktop: boolean;
  storedState: StoredState;
  defaultOpen: boolean;
}) => {
  if (!options.isDesktop) {
    return false;
  }
  if (options.storedState === null) {
    return options.defaultOpen;
  }
  return options.storedState;
};

export const useResponsiveSidebar = (options?: {
  defaultOpen?: boolean;
  storageKey?: string;
  desktopQuery?: string;
}) => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    options?.defaultOpen ?? false
  );
  const defaultOpen = options?.defaultOpen ?? false;
  const storageKey = options?.storageKey ?? SIDEBAR_STORAGE_KEY;
  const desktopQuery = options?.desktopQuery ?? DESKTOP_MEDIA_QUERY;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }
    const media = window.matchMedia(desktopQuery);
    const handleChange = (event?: MediaQueryListEvent) => {
      const matches = event?.matches ?? media.matches;
      setIsDesktop(matches);
      let storedState: StoredState = null;
      try {
        storedState = readStoredSidebarState(window.localStorage, storageKey);
      } catch {
        storedState = null;
      }
      setIsSidebarOpen(
        resolveSidebarOpen({
          isDesktop: matches,
          storedState,
          defaultOpen,
        })
      );
    };

    handleChange();
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [defaultOpen, desktopQuery, storageKey]);

  useEffect(() => {
    if (!isDesktop || typeof window === "undefined") {
      return;
    }
    try {
      writeStoredSidebarState(window.localStorage, storageKey, isSidebarOpen);
    } catch {
      // Ignore storage failures (e.g., privacy mode).
    }
  }, [isDesktop, isSidebarOpen, storageKey]);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  return {
    isDesktop,
    isSidebarOpen,
    setIsSidebarOpen,
    openSidebar,
    closeSidebar,
    toggleSidebar,
  };
};
