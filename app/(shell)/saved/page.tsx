"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { useVehiclesStore } from "@/stores/useVehiclesStore";
import { ROUTE_COLORS, ROUTE_LABELS } from "@/types/vehicle";

export default function SavedPage() {
  const { favourites, remove } = useFavouritesStore();
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const start = useVehiclesStore((s) => s.start);

  useEffect(() => start(), [start]);

  // live count per saved route
  const liveByRoute = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of vehicles) {
      const key = `route:${v.routeType}:${v.routeId}`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [vehicles]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-light-border bg-light-surface px-5 pb-4 pt-5 dark:border-dark-border dark:bg-dark-surface">
        <h1 className="text-xl font-bold text-light-text dark:text-dark-text">Saved</h1>
        <p className="mt-0.5 text-xs text-light-muted dark:text-dark-muted">
          Your starred routes and stops, with live status.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {favourites.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="text-4xl">🔖</div>
            <h2 className="text-base font-semibold text-light-text dark:text-dark-text">
              Nothing saved yet
            </h2>
            <p className="max-w-xs text-sm text-light-muted dark:text-dark-muted">
              Star a route from the{" "}
              <Link href="/routes" className="underline">
                Routes
              </Link>{" "}
              tab and it’ll appear here with its live status.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {favourites.map((f) => {
              const live = f.kind === "route" ? liveByRoute.get(f.id) ?? 0 : null;
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-xl border border-light-border bg-light-card p-3 dark:border-dark-border dark:bg-dark-card"
                >
                  <span
                    className="flex h-9 min-w-[2.75rem] items-center justify-center rounded-lg px-1.5 text-sm font-bold text-white"
                    style={{
                      backgroundColor: f.routeType ? ROUTE_COLORS[f.routeType] : "#64748B",
                    }}
                  >
                    {f.routeId ?? (f.kind === "stop" ? "◉" : "?")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-light-text dark:text-dark-text">
                      {f.label}
                    </div>
                    <div className="text-xs text-light-muted dark:text-dark-muted">
                      {f.kind === "route" && f.routeType ? ROUTE_LABELS[f.routeType] : "Stop"}
                    </div>
                  </div>
                  {live != null && (
                    <span
                      className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium"
                      style={{
                        color: live > 0 ? "#16A34A" : "#94A3B8",
                        backgroundColor: live > 0 ? "rgba(22,163,74,.12)" : "rgba(148,163,184,.12)",
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: live > 0 ? "#16A34A" : "#94A3B8" }}
                      />
                      {live > 0 ? `${live} live` : "none live"}
                    </span>
                  )}
                  <button
                    onClick={() => remove(f.id)}
                    aria-label="Remove"
                    className="rounded-full px-2 py-1 text-light-muted hover:bg-black/5 dark:text-dark-muted dark:hover:bg-white/5"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
