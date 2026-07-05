import type { LuasArrival } from "@/app/api/luas/route";
import { LUAS_SEGMENTS } from "@/lib/luasStops";

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

// Line geometry built by connecting each ordered SEGMENT's stops. Using segments
// (not a flat filter) keeps the Red Line's Saggart branch from zig-zagging back
// across the trunk, and preserves true running order on both lines.
export function luasLinesGeoJSON(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  return {
    type: "FeatureCollection",
    features: LUAS_SEGMENTS.map((seg) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: seg.stops.map((s) => [s.lng, s.lat] as [number, number]),
      },
      properties: { line: seg.line },
    })),
  };
}
