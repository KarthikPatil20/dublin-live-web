"use client";

import { ROUTE_COLORS } from "@/types/vehicle";

const ITEMS = [
  { label: "Bus", color: ROUTE_COLORS.bus },
  { label: "DART", color: ROUTE_COLORS.dart },
  { label: "Rail", color: ROUTE_COLORS.rail },
  { label: "Luas Red", color: ROUTE_COLORS.luasRed },
  { label: "Luas Green", color: ROUTE_COLORS.luasGreen },
];

export default function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 hidden rounded-lg bg-black/60 p-3 text-xs text-white backdrop-blur md:block">
      <div className="mb-1.5 font-semibold">Legend</div>
      {ITEMS.map((i) => (
        <div key={i.label} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: i.color }}
          />
          {i.label}
        </div>
      ))}
    </div>
  );
}
