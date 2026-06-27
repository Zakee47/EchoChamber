"use client";

import { useCallback, useSyncExternalStore } from "react";

export type RoomTheme = "clubhouse" | "classic";

const STORAGE_KEY = "echo:roomTheme";
const DEFAULT_THEME: RoomTheme = "clubhouse";

/**
 * Module-level theme store so every consumer (TopBar toggle, ThemeShell on each
 * page, the room view) shares one source of truth and updates together. Backed
 * by localStorage and synced across tabs via the `storage` event.
 */
let currentTheme: RoomTheme = DEFAULT_THEME;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): RoomTheme {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "clubhouse" || saved === "classic") return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

function emit() {
  listeners.forEach((l) => l());
}

function setTheme(t: RoomTheme) {
  if (t === currentTheme && hydrated) return;
  currentTheme = t;
  hydrated = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  // Hydrate from localStorage on first subscription.
  if (!hydrated) {
    const saved = read();
    hydrated = true;
    if (saved !== currentTheme) currentTheme = saved;
  }
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      const saved = read();
      if (saved !== currentTheme) {
        currentTheme = saved;
        emit();
      }
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Shared visual theme with one-click revert.
 * - "clubhouse": warm, light Clubhouse-inspired palette (default).
 * - "classic": the original dark glassmorphic look.
 * Persisted to localStorage so the choice sticks across sessions.
 */
export function useRoomTheme(): {
  theme: RoomTheme;
  setTheme: (t: RoomTheme) => void;
  toggle: () => void;
} {
  const theme = useSyncExternalStore(
    subscribe,
    () => currentTheme,
    () => DEFAULT_THEME,
  );

  const toggle = useCallback(() => {
    setTheme(currentTheme === "clubhouse" ? "classic" : "clubhouse");
  }, []);

  return { theme, setTheme, toggle };
}
