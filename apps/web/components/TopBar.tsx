"use client";

import Link from "next/link";
import { useRoomTheme } from "@/lib/roomTheme";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2 ${className}`}>
      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-brand/30 blur-md transition group-hover:bg-brand/50" />
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-black">
          E
        </span>
      </span>
      <span className="text-lg font-bold tracking-tight">
        Echo<span className="text-brand-400">Chamber</span>
      </span>
    </Link>
  );
}

export function TopBar({ active }: { active?: "explore" | "deepwiki" }) {
  return (
    <header className="rt-footer sticky top-0 z-30 border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/" label="Explore" current={active === "explore"} />
            <NavLink href="/deepwiki" label="DeepWiki" current={active === "deepwiki"} />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/deepwiki"
            className="hidden rounded-full border rt-divider rt-muted rt-hover px-4 py-2 text-sm font-medium transition sm:inline-block"
          >
            + Index an expert
          </Link>
          <Link
            href="/create"
            className="rt-primary rounded-full px-5 py-2 text-sm font-semibold transition hover:brightness-110"
          >
            Create Room
          </Link>
        </div>
      </div>
    </header>
  );
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useRoomTheme();
  return (
    <button
      onClick={toggle}
      className={`rounded-full border rt-divider rt-muted rt-hover px-3 py-2 text-xs font-medium transition ${className}`}
      title={
        theme === "clubhouse"
          ? "Switch to Classic (dark) theme"
          : "Switch to Clubhouse (light) theme"
      }
    >
      {theme === "clubhouse" ? "◑ Classic" : "◐ Clubhouse"}
    </button>
  );
}

function NavLink({ href, label, current }: { href: string; label: string; current?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        current ? "rt-chip rt-text" : "rt-muted hover:opacity-80"
      }`}
    >
      {label}
    </Link>
  );
}
