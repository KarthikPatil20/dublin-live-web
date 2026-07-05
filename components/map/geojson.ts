import type { LuasArrival } from "@/app/api/luas/route";
import { LUAS_STOPS } from "@/lib/luasStops";

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

// Static line geometry built by connecting stop coordinates in order.
export function luasLinesGeoJSON(): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const red = LUAS_STOPS.filter((s) => s.line === "red").map(
    (s) => [s.lng, s.lat] as [number, number],
  );
  const green = LUAS_STOPS.filter((s) => s.line === "green").map(
    (s) => [s.lng, s.lat] as [number, number],
  );
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: red },
        properties: { line: "red" },
      },
      {
        type: "Feature",
        geometry: { type: "LineString", coordinates: green },
        properties: { line: "green" },
      },
    ],
  };
}
