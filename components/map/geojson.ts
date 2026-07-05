import type { VehiclePosition } from "@/types/vehicle";
import type { LuasArrival } from "@/app/api/luas/route";
import { LUAS_STOPS } from "@/lib/luasStops";

export function vehiclesToGeoJSON(
  vehicles: VehiclePosition[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: vehicles.map((v) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [v.longitude, v.latitude] },
      properties: {
        vehicleId: v.vehicleId,
        routeType: v.routeType,
        routeId: v.routeId,
        label: v.vehicleLabel ?? v.routeId,
        bearing: v.bearing ?? 0,
      },
    })),
  };
}

export function luasStopsToGeoJSON(
  stops: LuasArrival[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: stops.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      properties: {
        name: s.name,
        line: s.line,
        due: s.nextDueMins,
        destination: s.destination ?? "",
      },
    })),
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
