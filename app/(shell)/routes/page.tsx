"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useVehiclesStore } from "@/stores/useVehiclesStore";
import { useFavouritesStore } from "@/stores/useFavouritesStore";
import { ROUTE_COLORS, ROUTE_LABELS, type RouteType, type VehiclePosition } from "@/types/vehicle";

// Distance in metres between two lat/lng points (haversine, small-angle fine here).
function metres(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function RoutesPage() {
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const start = useVehiclesStore((s) => s.start);
  const { toggle, has } = useFavouritesStore();

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoState, setGeoState] = useState<"idle" | "asking" | "ok" | "denied">("idle");
  const [q, setQ] = useState("");

  useEffect(() => start(), [start]);

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoState("denied");
      return;
    }
    setGeoState("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setGeoState("ok");
      },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  // Nearest live vehicles to the user (deduped to closest per route).
  const nearby = useMemo(() => {
    if (!pos) return [];
    const withDist = vehicles.map((v) => ({
      v,
      d: metres(pos.lat, pos.lng, v.latitude, v.longitude),
    }));
    const bestPerRoute = new Map<string, { v: VehiclePosition; d: number }>();
    for (const item of withDist) {
      const key = `${item.v.routeType}:${item.v.routeId}`;
      const cur = bestPerRoute.get(key);
      if (!cur || item.d < cur.d) bestPerRoute.set(key, item);
    }
    return [...bestPerRoute.values()].sort((a, b) => a.d - b.d).slice(0, 12);
  }, [pos, vehicles]);

  // All live routes (grouped), searchable.
  const routes = useMemo(() => {
    const term = q.trim().toLowerCase();
    const byRoute = new Map<string, { routeId: string; routeType: RouteType; count: number }>();
    for (const v of vehicles) {
      if (term && !`${v.routeId}`.toLowerCase().includes(term)) continue;
      const key = `${v.routeType}:${v.routeId}`;
      const cur = byRoute.get(key);
      if (cur) cur.count++;
      else byRoute.set(key, { routeId: v.routeId, routeType: v.routeType, count: 1 });
    }
    return [...byRoute.values()].sort((a, b) => b.count - a.count).slice(0, 40);
  }, [vehicles, q]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-light-border bg-light-surface px-5 pb-3 pt-5 dark:border-dark-border dark:bg-dark-surface">
        <h1 className="text-xl font-bold text-light-text dark:text-dark-text">Routes &amp; Nearby</h1>
        <p className="mt-0.5 text-xs text-light-muted dark:text-dark-muted">
          Find what’s running near you, or search every live route.
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a route, e.g. 46A, 15, DART…"
          className="mt-3 w-full rounded-xl border border-light-border bg-light-card px-3 py-2 text-sm text-light-text outline-none placeholder:text-light-muted focus:border-primary dark:border-dark-border dark:bg-dark-card dark:text-dark-text dark:placeholder:text-dark-muted"
        />
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Nearby */}
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-light-text dark:text-dark-text">Near me</h2>
            {geoState !== "ok" && (
              <button
                onClick={locate}
                className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white"
              >
                {geoState === "asking" ? "Locating…" : "📍 Use my location"}
              </button>
            )}
          </div>

          {geoState === "denied" && (
            <p className="text-xs text-light-muted dark:text-dark-muted">
              Location unavailable. Allow location access to see what’s nearest, or search below.
            </p>
          )}
          {geoState === "idle" && (
            <p className="text-xs text-light-muted dark:text-dark-muted">
              Tap “Use my location” to see the closest live buses, DART and trams.
            </p>
          )}
          {geoState === "ok" && nearby.length === 0 && (
            <p className="text-xs text-light-muted dark:text-dark-muted">Nothing live within range right now.</p>
          )}

          <ul className="flex flex-col gap-1.5">
            {nearby.map(({ v, d }) => (
              <RouteRow
                key={`near-${v.vehicleId}`}
                routeId={v.routeId}
                routeType={v.routeType}
                right={`${Math.round(d)} m`}
                saved={has(`route:${v.routeType}:${v.routeId}`)}
                onSave={() =>
                  toggle({
                    id: `route:${v.routeType}:${v.routeId}`,
                    kind: "route",
                    label: `${ROUTE_LABELS[v.routeType]} ${v.routeId}`,
                    routeType: v.routeType,
                    routeId: v.routeId,
                  })
                }
              />
            ))}
          </ul>
        </section>

        {/* All live routes */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-light-text dark:text-dark-text">
            {q.trim() ? "Matching live routes" : "All live routes"}
          </h2>
          {routes.length === 0 && (
            <p className="text-xs text-light-muted dark:text-dark-muted">No live routes match “{q}”.</p>
          )}
          <ul className="flex flex-col gap-1.5">
            {routes.map((r) => (
              <RouteRow
                key={`${r.routeType}:${r.routeId}`}
                routeId={r.routeId}
                routeType={r.routeType}
                right={`${r.count} live`}
                saved={has(`route:${r.routeType}:${r.routeId}`)}
                onSave={() =>
                  toggle({
                    id: `route:${r.routeType}:${r.routeId}`,
                    kind: "route",
                    label: `${ROUTE_LABELS[r.routeType]} ${r.routeId}`,
                    routeType: r.routeType,
                    routeId: r.routeId,
                  })
                }
              />
            ))}
          </ul>
        </section>

        <p className="mt-6 text-center text-xs text-light-muted dark:text-dark-muted">
          Open the <Link href="/" className="underline">Live Map</Link> to watch any of these move.
        </p>
      </div>
    </div>
  );
}

function RouteRow({
  routeId,
  routeType,
  right,
  saved,
  onSave,
}: {
  routeId: string;
  routeType: RouteType;
  right: string;
  saved: boolean;
  onSave: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-light-border bg-light-card p-2.5 dark:border-dark-border dark:bg-dark-card">
      <span
        className="flex h-9 min-w-[2.75rem] items-center justify-center rounded-lg px-1.5 text-sm font-bold text-white"
        style={{ backgroundColor: ROUTE_COLORS[routeType] }}
      >
        {routeId}
      </span>
      <span className="flex-1 text-sm text-light-text dark:text-dark-text">
        {ROUTE_LABELS[routeType]}
      </span>
      <span className="text-xs tabular-nums text-light-muted dark:text-dark-muted">{right}</span>
      <button
        onClick={onSave}
        aria-label={saved ? "Remove from saved" : "Save route"}
        className="text-lg leading-none"
        style={{ color: saved ? ROUTE_COLORS[routeType] : undefined }}
      >
        {saved ? "★" : "☆"}
      </button>
    </li>
  );
}
