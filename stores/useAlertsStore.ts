import { create } from "zustand";
import type { RouteAlert } from "@/app/api/trip-updates/route";
import { fetchAlerts } from "@/lib/api/client";

// Live delay-monitoring, derived from the GTFS-RT TripUpdates feed.
// Ported in spirit from gtfs_rt_alerts_service.dart (RouteAlert aggregation).

const REFRESH_MS = 30_000; // delays shift slowly; easy on the TFI rate limit

interface AlertsState {
  alerts: RouteAlert[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refreshNow: () => Promise<void>;
  start: () => void;
  stop: () => void;
}

let timer: ReturnType<typeof setInterval> | null = null;

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  loading: true,
  error: null,
  lastUpdated: null,

  refreshNow: async () => {
    try {
      const { alerts, error } = await fetchAlerts();
      set({ alerts, error: error ?? null, loading: false, lastUpdated: Date.now() });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "fetch error", loading: false });
    }
  },

  start: () => {
    if (timer) return;
    void get().refreshNow();
    timer = setInterval(() => void get().refreshNow(), REFRESH_MS);
  },

  stop: () => {
    if (timer) clearInterval(timer);
    timer = null;
  },
}));
