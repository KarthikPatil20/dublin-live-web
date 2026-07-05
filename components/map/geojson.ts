import type { LuasArrival } from "@/app/api/luas/route";
import { LUAS_TRACK } from "@/lib/luasTrack";

// Vehicle GeoJSON is now produced per-frame by lib/animation/vehicleAnimator.ts.

export function luasStopsToGeoJSON(
  stops: LuasArrival[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: stops.map((s) => {
      const due = s.nextDueMins;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
        properties: {
          name: s.name,
          line: s.line,
          due,
          // "signal" state: a tram is DUE or 1 min out → the stop pulses
          imminent: due != null && due <= 1,
          dueLabel: due == null ? "" : due <= 0 ? "DUE" : `${due} min`,
          destination: s.destination ?? "",
        },
      };
    }),
  };
}

// Line geometry drawn along the REAL Luas track alignment (curved rail geometry
// from OpenStreetMap), not straight stop-to-stop lines — so the route follows the
// actual right-of-way through bends, the M50 crossing, and the Saggart branch.
export function luasLinesGeoJSON(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: (["red", "green"] as const).map((line) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: LUAS_TRACK[line] },
      properties: { line },
    })),
  };
}
