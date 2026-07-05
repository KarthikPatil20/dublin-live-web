import { create } from "zustand";
import type { RouteType } from "@/types/vehicle";

// Ported from lib/providers/map_route_filter_provider.dart
export type FilterKey = "bus" | "dart" | "rail" | "luasRed" | "luasGreen";

interface FilterState {
  enabled: Record<FilterKey, boolean>;
  toggle: (key: FilterKey) => void;
  isVisible: (t: RouteType) => boolean;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  enabled: { bus: true, dart: true, rail: true, luasRed: true, luasGreen: true },
  toggle: (key) =>
    set((s) => ({ enabled: { ...s.enabled, [key]: !s.enabled[key] } })),
  isVisible: (t) => {
    if (t === "unknown") return get().enabled.bus;
    return get().enabled[t];
  },
}));
