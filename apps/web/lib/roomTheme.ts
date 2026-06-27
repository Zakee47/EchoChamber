"use client";

import { useCallback, useEffect, useState } from "react";

export type RoomTheme = "clubhouse" | "classic";

const STORAGE_KEY = "echo:roomTheme";
const DEFAULT_THEME: RoomTheme = "clubhouse";

/**
 * Room-scoped visual theme with one-click revert.
 * - "clubhouse": warm, light Clubhouse-inspired palette (default).
 * - "classic": the original dark glassmorphic look.
 * Persisted to localStorage so the choice sticks across sessions.
 */
export function useRoomTheme(): {
  theme: RoomTheme;
  setTheme: (t: RoomTheme) => void;
  toggle: () => void;
} {
  const [theme, setThemeState] = useState<RoomTheme>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "clubhouse" || saved === "classic") setThemeState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback((t: RoomTheme) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next: RoomTheme = prev === "clubhouse" ? "classic" : "clubhouse";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { theme, setTheme, toggle };
}
