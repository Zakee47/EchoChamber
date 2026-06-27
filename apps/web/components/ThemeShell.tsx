"use client";

import { useRoomTheme } from "@/lib/roomTheme";

/**
 * Applies the persisted room theme ("clubhouse" light / "classic" dark) to a
 * full page. The `.room-shell` + theme class drive the rt-* CSS tokens used by
 * page content, so the in-app theme toggle flips the whole app consistently.
 */
export function ThemeShell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { theme } = useRoomTheme();
  return (
    <main className={`room-shell ${theme} rt-bg rt-text min-h-screen ${className}`}>
      {children}
    </main>
  );
}
