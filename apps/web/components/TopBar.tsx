import Link from "next/link";

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
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/" label="Explore" current={active === "explore"} />
            <NavLink href="/deepwiki" label="DeepWiki" current={active === "deepwiki"} />
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/deepwiki"
            className="hidden rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 sm:inline-block"
          >
            + Index an expert
          </Link>
          <Link
            href="/create"
            className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:brightness-110"
          >
            Create Room
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label, current }: { href: string; label: string; current?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        current ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
