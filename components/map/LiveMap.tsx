"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useVehiclesStore } from "@/stores/useVehiclesStore";
import { useFilterStore } from "@/stores/useFilterStore";
import { DUBLIN_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from "@/lib/constants";
import { ROUTE_COLORS } from "@/types/vehicle";
import {
  vehiclesToGeoJSON,
  luasStopsToGeoJSON,
  luasLinesGeoJSON,
} from "./geojson";
import FilterBar from "./FilterBar";
import Legend from "./Legend";
import VehicleSheet, { type SelectedVehicle } from "./VehicleSheet";

const VEHICLE_SRC = "vehicles";
const LUAS_STOP_SRC = "luas-stops";
const LUAS_LINE_SRC = "luas-lines";

// Color match expression by routeType (falls back to bus green)
const COLOR_EXPR: mapboxgl.Expression = [
  "match",
  ["get", "routeType"],
  "bus", ROUTE_COLORS.bus,
  "dart", ROUTE_COLORS.dart,
  "rail", ROUTE_COLORS.rail,
  "luasRed", ROUTE_COLORS.luasRed,
  "luasGreen", ROUTE_COLORS.luasGreen,
  ROUTE_COLORS.unknown,
];

export default function LiveMap() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<SelectedVehicle | null>(null);

  const start = useVehiclesStore((s) => s.start);
  const stop = useVehiclesStore((s) => s.stop);
  const enabled = useFilterStore((s) => s.enabled);

  // init map once
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: DUBLIN_CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-left");
    map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: true }), "top-left");

    map.on("load", () => {
      // Luas lines (under everything)
      map.addSource(LUAS_LINE_SRC, { type: "geojson", data: luasLinesGeoJSON() });
      map.addLayer({
        id: "luas-line",
        type: "line",
        source: LUAS_LINE_SRC,
        paint: {
          "line-width": 3,
          "line-color": [
            "match",
            ["get", "line"],
            "red", ROUTE_COLORS.luasRed,
            "green", ROUTE_COLORS.luasGreen,
            "#888",
          ],
          "line-opacity": 0.85,
        },
      });

      // Luas stops
      map.addSource(LUAS_STOP_SRC, { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "luas-stop",
        type: "circle",
        source: LUAS_STOP_SRC,
        paint: {
          "circle-radius": 4,
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "match",
            ["get", "line"],
            "red", ROUTE_COLORS.luasRed,
            "green", ROUTE_COLORS.luasGreen,
            "#888",
          ],
        },
      });

      // Vehicles source + layers
      map.addSource(VEHICLE_SRC, { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "vehicle-dot",
        type: "circle",
        source: VEHICLE_SRC,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 4, 14, 7, 16, 9],
          "circle-color": COLOR_EXPR,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "vehicle-label",
        type: "symbol",
        source: VEHICLE_SRC,
        minzoom: 13,
        layout: {
          "text-field": ["get", "label"],
          "text-size": 10,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
        },
        paint: {
          "text-color": "#E6EDF3",
          "text-halo-color": "#0D1117",
          "text-halo-width": 1,
        },
      });

      // interactions
      map.on("click", "vehicle-dot", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, string>;
        const [lng, lat] = (f.geometry as GeoJSON.Point).coordinates;
        setSelected({
          vehicleId: p.vehicleId,
          routeId: p.routeId,
          routeType: p.routeType as SelectedVehicle["routeType"],
          label: p.label,
          lat,
          lng,
        });
      });
      map.on("mouseenter", "vehicle-dot", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "vehicle-dot", () => (map.getCanvas().style.cursor = ""));

      setReady(true);
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // start/stop polling with the map lifecycle
  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  // push vehicle + luas data to the map whenever the store changes
  useEffect(() => {
    if (!ready) return;
    const unsub = useVehiclesStore.subscribe((state) => {
      const map = mapRef.current;
      if (!map) return;
      const filtered = state.vehicles.filter((v) =>
        useFilterStore.getState().isVisible(v.routeType),
      );
      (map.getSource(VEHICLE_SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(
        vehiclesToGeoJSON(filtered),
      );
      (map.getSource(LUAS_STOP_SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(
        luasStopsToGeoJSON(state.luasStops),
      );
    });
    // prime immediately
    const st = useVehiclesStore.getState();
    const map = mapRef.current!;
    const filtered = st.vehicles.filter((v) => useFilterStore.getState().isVisible(v.routeType));
    (map.getSource(VEHICLE_SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(
      vehiclesToGeoJSON(filtered),
    );
    (map.getSource(LUAS_STOP_SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(
      luasStopsToGeoJSON(st.luasStops),
    );
    return unsub;
  }, [ready]);

  // re-apply filter instantly on toggle
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const st = useVehiclesStore.getState();
    const filtered = st.vehicles.filter((v) => useFilterStore.getState().isVisible(v.routeType));
    (map.getSource(VEHICLE_SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(
      vehiclesToGeoJSON(filtered),
    );
    // toggle luas line/stop visibility with the luas filters
    const luasOn = enabled.luasRed || enabled.luasGreen;
    ["luas-line", "luas-stop"].forEach((id) => {
      if (map.getLayer(id))
        map.setLayoutProperty(id, "visibility", luasOn ? "visible" : "none");
    });
  }, [enabled, ready]);

  const noToken = !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {noToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-bg p-6 text-center text-dark-muted">
          Set <code className="mx-1 text-accent">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in
          .env.local to load the map.
        </div>
      )}
      <FilterBar />
      <Legend />
      <StatusPill />
      {selected && <VehicleSheet vehicle={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function StatusPill() {
  const lastUpdated = useVehiclesStore((s) => s.lastUpdated);
  const count = useVehiclesStore((s) => s.vehicles.length);
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
      <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-green-400" />
      {count} live vehicles
      {lastUpdated ? ` · ${new Date(lastUpdated).toLocaleTimeString()}` : " · loading…"}
    </div>
  );
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
