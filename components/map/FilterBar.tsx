"use client";

import clsx from "clsx";
import { useFilterStore, type FilterKey } from "@/stores/useFilterStore";
import { ROUTE_COLORS } from "@/types/vehicle";

// Ported from lib/features/map/widgets/filter_bar.dart
const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: "bus", label: "Bus", color: ROUTE_COLORS.bus },
  { key: "dart", label: "DART", color: ROUTE_COLORS.dart },
  { key: "rail", label: "Rail", color: ROUTE_COLORS.rail },
  { key: "luasRed", label: "Luas Red", color: ROUTE_COLORS.luasRed },
  { key: "luasGreen", label: "Luas Green", color: ROUTE_COLORS.luasGreen },
];

export default function FilterBar() {
  const enabled = useFilterStore((s) => s.enabled);
  const toggle = useFilterStore((s) => s.toggle);

  return (
    <div className="absolute left-1/2 top-3 z-10 flex max-w-[95vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-full bg-black/60 px-2 py-2 backdrop-blur">
      {FILTERS.map((f) => {
        const on = enabled[f.key];
        return (
          <button
            key={f.key}
            onClick={() => toggle(f.key)}
            className={clsx(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              on ? "text-white" : "text-white/40",
            )}
            style={{ backgroundColor: on ? f.color : "rgba(255,255,255,0.08)" }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: on ? "#fff" : f.color }}
            />
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
