"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useVehiclesStore } from "@/stores/useVehiclesStore";
import { useFilterStore } from "@/stores/useFilterStore";
import { DUBLIN_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from "@/lib/constants";
import { ROUTE_COLORS } from "@/types/vehicle";
import { vehicleAnimator } from "@/lib/animation/vehicleAnimator";
import { addVehicleIcons } from "@/lib/mapIcons";
import { luasStopsToGeoJSON, luasLinesGeoJSON } from "./geojson";
import FilterBar from "./FilterBar";
import Legend from "./Legend";
import VehicleSheet, { type SelectedVehicle } from "./VehicleSheet";

const VEHICLE_SRC = "vehicles";
const LUAS_STOP_SRC = "luas-stops";
const LUAS_LINE_SRC = "luas-lines";

const FRAME_MS = 33; // ~30fps — plenty for marker motion, kind to batteries
const PULSE_MS = 1_600; // period of the "signal" pulse rings

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

const LUAS_LINE_COLOR: mapboxgl.Expression = [
  "match",
  ["get", "line"],
  "red", ROUTE_COLORS.luasRed,
  "green", ROUTE_COLORS.luasGreen,
  "#888",
];

export default function LiveMap() {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<SelectedVehicle | null>(null);
  const [follow, setFollow] = useState(false);

  const selectedRef = useRef<SelectedVehicle | null>(null);
  const followRef = useRef<{ id: string; since: number } | null>(null);
  selectedRef.current = selected;

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
      addVehicleIcons(map);

      // ---- Luas network (under everything) ----
      map.addSource(LUAS_LINE_SRC, { type: "geojson", data: luasLinesGeoJSON() });
      map.addLayer({
        id: "luas-line-casing",
        type: "line",
        source: LUAS_LINE_SRC,
        paint: { "line-width": 6, "line-color": "#000000", "line-opacity": 0.35 },
      });
      map.addLayer({
        id: "luas-line",
        type: "line",
        source: LUAS_LINE_SRC,
        paint: { "line-width": 2.5, "line-color": LUAS_LINE_COLOR, "line-opacity": 0.9 },
      });

      map.addSource(LUAS_STOP_SRC, { type: "geojson", data: emptyFC() });
      // Pulsing "tram arriving" signal — animated in the frame loop below
      map.addLayer({
        id: "luas-stop-pulse",
        type: "circle",
        source: LUAS_STOP_SRC,
        filter: ["==", ["get", "imminent"], true],
        paint: {
          "circle-radius": 6,
          "circle-color": LUAS_LINE_COLOR,
          "circle-opacity": 0.5,
          "circle-stroke-width": 0,
        },
      });
      map.addLayer({
        id: "luas-stop",
        type: "circle",
        source: LUAS_STOP_SRC,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 14, 4.5],
          "circle-color": "#ffffff",
          "circle-stroke-width": 2,
          "circle-stroke-color": LUAS_LINE_COLOR,
        },
      });
      map.addLayer({
        id: "luas-stop-label",
        type: "symbol",
        source: LUAS_STOP_SRC,
        minzoom: 13.5,
        layout: {
          "text-field": [
            "case",
            ["==", ["get", "dueLabel"], ""],
            ["get", "name"],
            ["concat", ["get", "name"], " · ", ["get", "dueLabel"]],
          ],
          "text-size": 10,
          "text-offset": [0, 1.1],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#c9d1d9",
          "text-halo-color": "#0D1117",
          "text-halo-width": 1.2,
        },
      });

      // ---- Vehicles ----
      map.addSource(VEHICLE_SRC, { type: "geojson", data: emptyFC() });

      // Soft breathing glow under every vehicle — opacity animated in the frame loop
      map.addLayer({
        id: "vehicle-glow",
        type: "circle",
        source: VEHICLE_SRC,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 7, 12, 11, 16, 20],
          "circle-color": COLOR_EXPR,
          "circle-blur": 1,
          "circle-opacity": 0.2,
        },
      });

      // Pulse halo under the selected vehicle — animated in the frame loop
      map.addLayer({
        id: "vehicle-pulse",
        type: "circle",
        source: VEHICLE_SRC,
        filter: ["==", ["get", "vehicleId"], "__none__"],
        paint: {
          "circle-radius": 14,
          "circle-color": COLOR_EXPR,
          "circle-opacity": 0.35,
          "circle-stroke-width": 1,
          "circle-stroke-color": COLOR_EXPR,
          "circle-stroke-opacity": 0.4,
        },
      });

      // Direction pucks: arrow when heading is known, dot otherwise.
      map.addLayer({
        id: "vehicle-icon",
        type: "symbol",
        source: VEHICLE_SRC,
        layout: {
          "icon-image": [
            "concat",
            ["case", ["get", "hasBearing"], "veh-", "dot-"],
            ["get", "routeType"],
          ],
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-size": ["interpolate", ["linear"], ["zoom"], 9, 0.34, 12, 0.48, 16, 0.85],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
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
          "text-offset": [0, 1.3],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#E6EDF3",
          "text-halo-color": "#0D1117",
          "text-halo-width": 1.2,
        },
      });

      // ---- interactions ----
      map.on("click", "vehicle-icon", (e) => {
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
      map.on("click", (e) => {
        // tap on empty map closes the sheet
        const hits = map.queryRenderedFeatures(e.point, { layers: ["vehicle-icon"] });
        if (!hits.length) {
          setSelected(null);
          setFollow(false);
        }
      });
      map.on("mouseenter", "vehicle-icon", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "vehicle-icon", () => (map.getCanvas().style.cursor = ""));
      map.on("dragstart", () => setFollow(false)); // user takes the wheel back

      setReady(true);
    });

    mapRef.current = map;
    if (process.env.NODE_ENV !== "production") {
      // dev-only handle for debugging in the browser console
      (window as unknown as Record<string, unknown>).__map = map;
    }
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

  // feed poll results into the animator; luas stops go straight to their source
  useEffect(() => {
    if (!ready) return;
    const push = (vehicles: Parameters<typeof vehicleAnimator.setData>[0], luas: unknown) => {
      vehicleAnimator.setData(vehicles);
      (mapRef.current?.getSource(LUAS_STOP_SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(
        luasStopsToGeoJSON(luas as Parameters<typeof luasStopsToGeoJSON>[0]),
      );
    };
    const unsub = useVehiclesStore.subscribe((s) => push(s.vehicles, s.luasStops));
    const st = useVehiclesStore.getState();
    push(st.vehicles, st.luasStops);
    return unsub;
  }, [ready]);

  // ---- the animation loop: interpolated positions + pulse signals ----
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let lastFrame = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden || now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      const map = mapRef.current;
      if (!map) return;

      (map.getSource(VEHICLE_SRC) as mapboxgl.GeoJSONSource | undefined)?.setData(
        vehicleAnimator.frame(now),
      );

      // Gentle breathing glow under the whole fleet (slower than the pulses).
      if (map.getLayer("vehicle-glow")) {
        const breath = 0.5 + 0.5 * Math.sin((now / 2_400) * Math.PI * 2);
        map.setPaintProperty("vehicle-glow", "circle-opacity", 0.14 + 0.1 * breath);
      }

      // Shared pulse phase drives both "signal" layers.
      const phase = (now % PULSE_MS) / PULSE_MS; // 0 → 1
      if (map.getLayer("vehicle-pulse")) {
        map.setPaintProperty("vehicle-pulse", "circle-radius", 12 + phase * 18);
        map.setPaintProperty("vehicle-pulse", "circle-opacity", 0.4 * (1 - phase));
        map.setPaintProperty("vehicle-pulse", "circle-stroke-opacity", 0.5 * (1 - phase));
      }
      if (map.getLayer("luas-stop-pulse")) {
        map.setPaintProperty("luas-stop-pulse", "circle-radius", 5 + phase * 14);
        map.setPaintProperty("luas-stop-pulse", "circle-opacity", 0.55 * (1 - phase));
      }

      // Follow mode: hard-center on the (already smooth) vehicle position.
      const f = followRef.current;
      if (f && now - f.since > 700) {
        const snap = vehicleAnimator.getSnapshot(f.id);
        if (snap) map.setCenter([snap.lng, snap.lat]);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  // selected vehicle: aim the pulse halo at it
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map?.getLayer("vehicle-pulse")) return;
    map.setFilter("vehicle-pulse", [
      "==",
      ["get", "vehicleId"],
      selected?.vehicleId ?? "__none__",
    ]);
  }, [selected, ready]);

  // follow toggle: ease to the vehicle, then the frame loop keeps centering
  useEffect(() => {
    if (!follow || !selected) {
      followRef.current = null;
      return;
    }
    followRef.current = { id: selected.vehicleId, since: performance.now() };
    const map = mapRef.current;
    const snap = vehicleAnimator.getSnapshot(selected.vehicleId);
    if (map && snap) {
      map.easeTo({
        center: [snap.lng, snap.lat],
        zoom: Math.max(map.getZoom(), 14.5),
        duration: 600,
      });
    }
  }, [follow, selected]);

  // route-type filters applied directly on the layers (instant, no data rebuild)
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    const visible = (Object.keys(enabled) as (keyof typeof enabled)[]).filter(
      (k) => enabled[k],
    ) as string[];
    if (enabled.bus) visible.push("unknown");
    const typeFilter: mapboxgl.Expression = [
      "in",
      ["get", "routeType"],
      ["literal", visible],
    ];
    ["vehicle-icon", "vehicle-label", "vehicle-glow"].forEach((id) => {
      if (map.getLayer(id)) map.setFilter(id, typeFilter);
    });
    const luasOn = enabled.luasRed || enabled.luasGreen;
    ["luas-line-casing", "luas-line", "luas-stop", "luas-stop-pulse", "luas-stop-label"].forEach(
      (id) => {
        if (map.getLayer(id))
          map.setLayoutProperty(id, "visibility", luasOn ? "visible" : "none");
      },
    );
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
      {selected && (
        <VehicleSheet
          vehicle={selected}
          follow={follow}
          onToggleFollow={() => setFollow((f) => !f)}
          onClose={() => {
            setSelected(null);
            setFollow(false);
          }}
        />
      )}
    </div>
  );
}

function StatusPill() {
  const lastUpdated = useVehiclesStore((s) => s.lastUpdated);
  const count = useVehiclesStore((s) => s.vehicles.length);
  const error = useVehiclesStore((s) => s.error);
  const [, forceTick] = useState(0);

  // tick every second so "Xs ago" stays live
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const ago = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000)) : null;
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
      <span
        className={`mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full ${
          error ? "bg-amber-400" : "bg-green-400"
        }`}
      />
      {count} live vehicles
      {ago != null ? ` · ${ago}s ago` : " · loading…"}
      {error ? " · cached" : ""}
    </div>
  );
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
