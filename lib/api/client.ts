import type { VehiclePosition } from "@/types/vehicle";
import type { LuasArrival } from "@/app/api/luas/route";
import type { RouteAlert, StopTime } from "@/app/api/trip-updates/route";

// Thin browser fetchers — call our OWN same-origin API routes (no CORS, keys stay server-side).

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export function fetchBuses() {
  return getJson<{ vehicles: VehiclePosition[] }>("/api/vehicles");
}

export function fetchRail() {
  return getJson<{ vehicles: VehiclePosition[] }>("/api/rail");
}

export function fetchLuas() {
  return getJson<{ stops: LuasArrival[] }>("/api/luas");
}

export function fetchAlerts() {
  return getJson<{ alerts: RouteAlert[]; generatedAt: number; feedTrips: number; error?: string }>(
    "/api/trip-updates?view=alerts",
  );
}

export function fetchTripStops(tripId: string) {
  return getJson<{ tripId: string; routeId: string; stopTimes: StopTime[] }>(
    `/api/trip-updates?trip=${encodeURIComponent(tripId)}`,
  );
}
