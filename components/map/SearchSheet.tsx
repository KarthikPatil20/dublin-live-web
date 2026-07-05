"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useVehiclesStore } from "@/stores/useVehiclesStore";
import { ROUTE_COLORS, ROUTE_EMOJI, ROUTE_LABELS, type RouteType } from "@/types/vehicle";

export interface SearchTarget {
  lng: number;
  lat: number;
  label: string;
  kind: "vehicle" | "stop";
  vehicleId?: string;
}

// A search overlay: find a live route/vehicle or a Luas stop and jump the map to it.
export default function SearchSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (t: SearchTarget) => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const luasStops = useVehiclesStore((s) => s.luasStops);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQ("");
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return { routes: [], stops: [] };

    // group live vehicles by route so one row = one route, with a live count
    const byRoute = new Map<
      string,
      { routeId: string; routeType: RouteType; count: number; lng: number; lat: number; vehicleId: string }
    >();
    for (const v of vehicles) {
      const hay = `${v.routeId} ${v.vehicleLabel ?? ""}`.toLowerCase();
      if (!hay.includes(term)) continue;
      const key = `${v.routeType}:${v.routeId}`;
      const cur = byRoute.get(key);
      if (cur) cur.count++;
      else
        byRoute.set(key, {
          routeId: v.routeId,
          routeType: v.routeType,
          count: 1,
          lng: v.longitude,
          lat: v.latitude,
          vehicleId: v.vehicleId,
        });
    }
    const routes = [...byRoute.values()].sort((a, b) => b.count - a.count).slice(0, 8);

    const stops = luasStops
      .filter((s) => s.name.toLowerCase().includes(term))
      .slice(0, 6);

    return { routes, stops };
  }, [q, vehicles, luasStops]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-auto mt-4 w-[92%] max-w-lg overflow-hidden rounded-2xl border border-light-border bg-light-surface shadow-2xl dark:border-dark-border dark:bg-dark-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-light-border p-3 dark:border-dark-border">
          <span className="text-light-muted dark:text-dark-muted">🔍</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search route, e.g. 46A, DART, Luas stop…"
            className="flex-1 bg-transparent text-sm text-light-text outline-none placeholder:text-light-muted dark:text-dark-text dark:placeholder:text-dark-muted"
          />
          <button
            onClick={onClose}
            className="rounded-full px-2 py-0.5 text-light-muted hover:bg-black/5 dark:text-dark-muted dark:hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {!q.trim() && (
            <p className="p-6 text-center text-sm text-light-muted dark:text-dark-muted">
              Type a route number, DART, or a Luas stop name to find it live on the map.
            </p>
          )}

          {q.trim() && results.routes.length === 0 && results.stops.length === 0 && (
            <p className="p-6 text-center text-sm text-light-muted dark:text-dark-muted">
              No live matches for “{q}”. It may not be running right now.
            </p>
          )}

          {results.routes.length > 0 && (
            <Section title="Live routes">
              {results.routes.map((r) => (
                <button
                  key={`${r.routeType}:${r.routeId}`}
                  onClick={() =>
                    onPick({
                      lng: r.lng,
                      lat: r.lat,
                      label: `${ROUTE_LABELS[r.routeType]} ${r.routeId}`,
                      kind: "vehicle",
                      vehicleId: r.vehicleId,
                    })
                  }
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span
                    className="flex h-8 min-w-[2.5rem] items-center justify-center rounded-md px-1.5 text-xs font-bold text-white"
                    style={{ backgroundColor: ROUTE_COLORS[r.routeType] }}
                  >
                    {r.routeId}
                  </span>
                  <span className="flex-1 text-sm text-light-text dark:text-dark-text">
                    {ROUTE_EMOJI[r.routeType]} {ROUTE_LABELS[r.routeType]}
                  </span>
                  <span className="text-xs text-light-muted dark:text-dark-muted">
                    {r.count} live
                  </span>
                </button>
              ))}
            </Section>
          )}

          {results.stops.length > 0 && (
            <Section title="Luas stops">
              {results.stops.map((s) => (
                <button
                  key={s.code}
                  onClick={() =>
                    onPick({ lng: s.lng, lat: s.lat, label: s.name, kind: "stop" })
                  }
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span
                    className="h-3 w-3 rounded-full border-2"
                    style={{
                      borderColor: s.line === "red" ? ROUTE_COLORS.luasRed : ROUTE_COLORS.luasGreen,
                    }}
                  />
                  <span className="flex-1 text-sm text-light-text dark:text-dark-text">{s.name}</span>
                  <span className="text-xs text-light-muted dark:text-dark-muted">
                    {s.nextDueMins != null ? `${s.nextDueMins <= 0 ? "DUE" : s.nextDueMins + " min"}` : ""}
                  </span>
                </button>
              ))}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-light-muted dark:text-dark-muted">
        {title}
      </div>
      {children}
    </div>
  );
}
