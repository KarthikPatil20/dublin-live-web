import { create } from "zustand";
import type { VehiclePosition } from "@/types/vehicle";
import type { LuasArrival } from "@/app/api/luas/route";
import { fetchBuses, fetchRail, fetchLuas } from "@/lib/api/client";
import { VEHICLE_REFRESH_MS } from "@/lib/constants";

// Ported from lib/providers/vehicles_provider.dart (VehiclesNotifier).
// Polls the three feeds and merges into one vehicle list, de-duped by id.

interface VehiclesState {
  vehicles: VehiclePosition[];
  luasStops: LuasArrival[];
  loading: boolean;
  lastUpdated: number | null;
  error: string | null;
  start: () => void;
  stop: () => void;
  refreshNow: () => Promise<void>;
}

let timers: ReturnType<typeof setInterval>[] = [];
let buses: VehiclePosition[] = [];
let rail: VehiclePosition[] = [];

function merge(set: (p: Partial<VehiclesState>) => void) {
  const seen = new Set<string>();
  const merged: VehiclePosition[] = [];
  for (const v of [...buses, ...rail]) {
    if (!seen.has(v.vehicleId)) {
      seen.add(v.vehicleId);
      merged.push(v);
    }
  }
  set({ vehicles: merged, lastUpdated: Date.now(), loading: false });
}

export const useVehiclesStore = create<VehiclesState>((set, get) => ({
  vehicles: [],
  luasStops: [],
  loading: true,
  lastUpdated: null,
  error: null,

  refreshNow: async () => {
    const results = await Promise.allSettled([fetchBuses(), fetchRail(), fetchLuas()]);
    const [b, r, l] = results;
    if (b.status === "fulfilled") buses = b.value.vehicles;
    if (r.status === "fulfilled") rail = r.value.vehicles;
    if (l.status === "fulfilled") set({ luasStops: l.value.stops });
    const err = results.find((x) => x.status === "rejected");
    set({ error: err ? (err as PromiseRejectedResult).reason?.message ?? "fetch error" : null });
    merge(set);
  },

  start: () => {
    if (timers.length) return; // already running
    void get().refreshNow();
    // Buses refresh every 15s (TFI limit); rail/luas share the cycle here for simplicity.
    timers.push(setInterval(() => void get().refreshNow(), VEHICLE_REFRESH_MS));
  },

  stop: () => {
    timers.forEach(clearInterval);
    timers = [];
  },
}));
