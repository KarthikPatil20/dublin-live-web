"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/useThemeStore";

// Ported from lib/features/shell/shell_screen.dart — 5 destinations.
const TABS = [
  { href: "/", label: "Live Map", icon: "🗺️" },
  { href: "/routes", label: "Routes", icon: "🧭" },
  { href: "/saved", label: "Saved", icon: "🔖" },
  { href: "/alerts", label: "Alerts", icon: "🔔" },
  { href: "/account", label: "Account", icon: "👤" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const init = useThemeStore((s) => s.init);
  useEffect(() => init(), [init]);
  const pathname = usePathname();

  return (
    <div className="flex h-[100dvh] w-full flex-col md:flex-row bg-light-bg dark:bg-dark-bg">
      {/* Desktop side rail */}
      <nav className="hidden md:flex md:w-56 md:flex-col md:gap-1 md:border-r md:border-light-border md:bg-light-surface md:p-3 dark:md:border-dark-border dark:md:bg-dark-surface">
        <div className="mb-4 flex items-center gap-2 px-2 py-3">
          <span className="text-2xl">🚍</span>
          <span className="text-lg font-bold text-primary dark:text-dark-text">
            Dublin Live
          </span>
        </div>
        {TABS.map((t) => (
          <NavItem key={t.href} {...t} active={isActive(pathname, t.href)} horizontal />
        ))}
      </nav>

      {/* Main content */}
      <main className="relative flex-1 overflow-hidden">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="flex shrink-0 items-stretch justify-around border-t border-light-border bg-light-surface md:hidden dark:border-dark-border dark:bg-dark-surface">
        {TABS.map((t) => (
          <NavItem key={t.href} {...t} active={isActive(pathname, t.href)} />
        ))}
      </nav>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavItem({
  href,
  label,
  icon,
  active,
  horizontal,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  horizontal?: boolean;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
        horizontal ? "justify-start" : "flex-col justify-center flex-1 py-2 text-xs gap-0.5",
        active
          ? "bg-primary/10 text-primary dark:bg-primaryLight/15 dark:text-primaryLight font-semibold"
          : "text-light-muted hover:bg-black/5 dark:text-dark-muted dark:hover:bg-white/5",
      )}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
