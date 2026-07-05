"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ROUTE_COLORS, ROUTE_EMOJI, ROUTE_LABELS, type RouteType } from "@/types/vehicle";
import { vehicleAnimator, type VehicleSnapshot } from "@/lib/animation/vehicleAnimator";
import { fetchTripStops } from "@/lib/api/client";
import type { StopTime } from "@/app/api/trip-updates/route";

export interface SelectedVehicle {
  vehicleId: string;
  routeId: string;
  routeType: RouteType;
  label: string;
  tripId: string | null;
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
  const [stops, setStops] = useState<StopTime[] | null>(null);
  const [journeyState, setJourneyState] = useState<"idle" | "loading" | "empty" | "ready">("idle");

  useEffect(() => {
    const pull = () => setLive(vehicleAnimator.getSnapshot(vehicle.vehicleId));
    pull();
    const t = setInterval(pull, 500);
    return () => clearInterval(t);
  }, [vehicle.vehicleId]);

  // Upcoming stops for this trip (buses carry a tripId in the GTFS-RT feed).
  // Only the next few stops still ahead of "now" are shown.
  useEffect(() => {
    const tripId = vehicle.tripId;
    if (!tripId) {
      setStops(null);
      setJourneyState("idle");
      return;
    }
    let cancelled = false;
    setJourneyState("loading");
    const load = async () => {
      try {
        const { stopTimes } = await fetchTripStops(tripId);
        if (cancelled) return;
        const nowSec = Date.now() / 1000;
        // The feed predicts a real time only for the imminent stop(s); later stops
        // carry delay-only (time: 0). Keep stops in sequence, dropping only those
        // whose predicted time is already in the past.
        const ahead = stopTimes
          .map((s) => ({
            ...s,
            arrivalTime: s.arrivalTime && s.arrivalTime > 0 ? s.arrivalTime : null,
            departureTime: s.departureTime && s.departureTime > 0 ? s.departureTime : null,
          }))
          .filter((s) => {
            const t = s.arrivalTime ?? s.departureTime;
            return t == null || t >= nowSec - 60; // keep delay-only stops
          })
          .sort((a, b) => a.stopSequence - b.stopSequence)
          .slice(0, 8);
        setStops(ahead);
        setJourneyState(ahead.length ? "ready" : "empty");
      } catch {
        if (!cancelled) setJourneyState("empty");
      }
    };
    void load();
    const t = setInterval(load, 20_000); // refresh ETAs as delays shift
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [vehicle.tripId]);

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

        {/* Journey — upcoming stops with live ETAs (buses only; from GTFS-RT TripUpdates) */}
        {journeyState !== "idle" && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-light-text dark:text-dark-text">
                Upcoming stops
              </span>
              {journeyState === "loading" && (
                <span className="text-[10px] text-light-muted dark:text-dark-muted">loading…</span>
              )}
            </div>

            {journeyState === "empty" && (
              <p className="text-xs text-light-muted dark:text-dark-muted">
                No upcoming stop times reported for this trip right now.
              </p>
            )}

            {journeyState === "ready" && stops && (
              <ol className="relative max-h-52 overflow-y-auto pl-4">
                {/* vertical line */}
                <span
                  className="absolute left-[5px] top-1 bottom-1 w-px"
                  style={{ backgroundColor: `${color}55` }}
                />
                {stops.map((s, i) => (
                  <li key={`${s.stopId}-${s.stopSequence}`} className="relative py-1.5">
                    <span
                      className="absolute -left-4 top-2.5 h-2 w-2 rounded-full border-2"
                      style={{
                        borderColor: color,
                        backgroundColor: i === 0 ? color : "transparent",
                      }}
                    />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs text-light-text dark:text-dark-text">
                        {i === 0 ? "Next: " : ""}Stop {s.stopId || s.stopSequence}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="text-xs font-semibold tabular-nums text-light-text dark:text-dark-text">
                          {etaLabel(s)}
                        </span>
                        {delayChip(s)}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

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

// "in 4 min" / "due" from the stop's predicted arrival time. Later stops in the
// feed carry no absolute time (only a delay) — for those we show the delay state.
function etaLabel(s: StopTime): string {
  const t = s.arrivalTime ?? s.departureTime;
  if (t != null && t > 0) {
    const mins = Math.round((t * 1000 - Date.now()) / 60000);
    if (mins <= 0) return "due";
    if (mins === 1) return "1 min";
    return `${mins} min`;
  }
  // no predicted clock time — fall back to on-time / delayed wording
  if (s.arrivalDelaySec == null) return "scheduled";
  return s.arrivalDelaySec > 60 ? "delayed" : "on time";
}

// A small chip showing predicted delay/early against schedule.
function delayChip(s: StopTime) {
  const d = s.arrivalDelaySec;
  if (d == null || Math.abs(d) < 60) return null;
  const late = d > 0;
  const mins = Math.round(Math.abs(d) / 60);
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
      style={{
        color: "#fff",
        backgroundColor: late ? "#D97706" : "#16A34A",
      }}
    >
      {late ? `+${mins}` : `−${mins}`}
    </span>
  );
}
