"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ROUTE_COLORS, ROUTE_EMOJI, ROUTE_LABELS, type RouteType } from "@/types/vehicle";
import { vehicleAnimator, type VehicleSnapshot } from "@/lib/animation/vehicleAnimator";

export interface SelectedVehicle {
  vehicleId: string;
  routeId: string;
  routeType: RouteType;
  label: string;
  lat: number;
  lng: number;
}

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

function compass(bearing: number): string {
  return COMPASS[Math.round(bearing / 45) % 8];
}

// Ported from lib/features/map/widgets/vehicle_bottom_sheet.dart — now live:
// values refresh from the animator so speed/heading/position track the marker.
export default function VehicleSheet({
  vehicle,
  follow,
  onToggleFollow,
  onClose,
}: {
  vehicle: SelectedVehicle;
  follow: boolean;
  onToggleFollow: () => void;
  onClose: () => void;
}) {
  const color = ROUTE_COLORS[vehicle.routeType];
  const [live, setLive] = useState<VehicleSnapshot | null>(null);

  useEffect(() => {
    const pull = () => setLive(vehicleAnimator.getSnapshot(vehicle.vehicleId));
    pull();
    const t = setInterval(pull, 500);
    return () => clearInterval(t);
  }, [vehicle.vehicleId]);

  const lat = live?.lat ?? vehicle.lat;
  const lng = live?.lng ?? vehicle.lng;
  const moving = live != null && live.speedKmh > 1;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 md:inset-x-auto md:bottom-4 md:left-4 md:w-80">
      <div
        className="rounded-t-2xl border border-light-border bg-light-surface p-4 shadow-2xl md:rounded-2xl dark:border-dark-border dark:bg-dark-card"
        style={{ borderTopColor: color, borderTopWidth: 3 }}
      >
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
              style={{ backgroundColor: `${color}22` }}
            >
              {ROUTE_EMOJI[vehicle.routeType]}
            </span>
            <div>
              <div className="text-base font-bold text-light-text dark:text-dark-text">
                {live?.label ?? vehicle.label}
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color }}>
                {ROUTE_LABELS[vehicle.routeType]}
                {moving && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-light-muted dark:text-dark-muted">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
                    moving
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-light-muted hover:bg-black/5 dark:text-dark-muted dark:hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Row k="Route" v={live?.routeId || vehicle.routeId || "—"} />
          <Row k="Vehicle" v={vehicle.vehicleId} />
          <Row
            k="Speed"
            v={live ? `${live.speedKmh} km/h` : "—"}
          />
          <Row
            k="Heading"
            v={live?.hasBearing ? `${compass(live.bearing)} · ${Math.round(live.bearing)}°` : "—"}
          />
          <Row k="Position" v={`${lat.toFixed(5)}, ${lng.toFixed(5)}`} wide />
        </dl>

        <button
          onClick={onToggleFollow}
          className={clsx(
            "mt-3 w-full rounded-xl py-2 text-sm font-semibold transition-colors",
            follow
              ? "text-white"
              : "bg-black/5 text-light-text hover:bg-black/10 dark:bg-white/10 dark:text-dark-text dark:hover:bg-white/15",
          )}
          style={follow ? { backgroundColor: color } : undefined}
        >
          {follow ? "◉ Following — tap to stop" : "○ Follow this vehicle"}
        </button>
      </div>
    </div>
  );
}

function Row({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-xs text-light-muted dark:text-dark-muted">{k}</dt>
      <dd className="font-medium text-light-text dark:text-dark-text">{v}</dd>
    </div>
  );
}
