import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

function AnchorMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-500 dark:text-indigo-300">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <circle cx="12" cy="5" r="2.5" />
        <path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M4 13h2M18 13h2" />
      </svg>
    </span>
  );
}

export function SiteNav({ active }: { active?: "home" | "docs" }) {
  const link = (href: string, label: string, key: "home" | "docs") => (
    <Link
      href={href}
      className={
        active === key
          ? "font-medium text-indigo-600 dark:text-indigo-300"
          : "text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
      }
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <AnchorMark />
          <span className="text-base font-bold tracking-tight">RealityAnchor</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {link("/", "Home", "home")}
          {link("/docs", "Docs", "docs")}
          <Link
            href="/mcp-view"
            className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-3.5 py-1.5 font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Open the app
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-8 text-sm text-slate-500 sm:flex-row dark:text-slate-400">
        <p>RealityAnchor — an Alexa+ MCP add-on for OCD & cognitive loops.</p>
        <div className="flex gap-4">
          <Link href="/docs" className="hover:text-slate-900 dark:hover:text-white">
            Docs
          </Link>
          <Link
            href="/mcp-view"
            className="hover:text-slate-900 dark:hover:text-white"
          >
            App
          </Link>
        </div>
      </div>
    </footer>
  );
}
