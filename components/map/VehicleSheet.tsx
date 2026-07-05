"use client";

import { ROUTE_COLORS, ROUTE_EMOJI, ROUTE_LABELS, type RouteType } from "@/types/vehicle";

export interface SelectedVehicle {
  vehicleId: string;
  routeId: string;
  routeType: RouteType;
  label: string;
  lat: number;
  lng: number;
}

// Ported from lib/features/map/widgets/vehicle_bottom_sheet.dart
export default function VehicleSheet({
  vehicle,
  onClose,
}: {
  vehicle: SelectedVehicle;
  onClose: () => void;
}) {
  const color = ROUTE_COLORS[vehicle.routeType];
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 md:inset-x-auto md:bottom-4 md:left-4 md:w-80">
      <div className="rounded-t-2xl border border-light-border bg-light-surface p-4 shadow-2xl md:rounded-2xl dark:border-dark-border dark:bg-dark-card">
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
                {vehicle.label}
              </div>
              <div className="text-xs" style={{ color }}>
                {ROUTE_LABELS[vehicle.routeType]}
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
          <Row k="Route ID" v={vehicle.routeId || "—"} />
          <Row k="Vehicle" v={vehicle.vehicleId} />
          <Row k="Lat" v={vehicle.lat.toFixed(5)} />
          <Row k="Lng" v={vehicle.lng.toFixed(5)} />
        </dl>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-light-muted dark:text-dark-muted">{k}</dt>
      <dd className="font-medium text-light-text dark:text-dark-text">{v}</dd>
    </div>
  );
}
