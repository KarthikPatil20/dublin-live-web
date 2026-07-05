import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { inIreland } from "@/lib/constants";
import type { VehiclePosition } from "@/types/vehicle";

// Server-side proxy replacing lib/services/irish_rail_service.dart.
// Irish Rail realtime API — XML, no API key. DART (D), Suburban (S), Mainline (M).

export const dynamic = "force-dynamic";
export const revalidate = 0;

const BASE = "https://api.irishrail.ie/realtime/realtime.asmx";
// Keep all tag values as strings so codes like "E221" aren't mangled into NaN.
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });

type Feed = { type: "D" | "S" | "M"; routeType: "dart" | "rail" };
const FEEDS: Feed[] = [
  { type: "D", routeType: "dart" },
  { type: "S", routeType: "rail" },
  { type: "M", routeType: "rail" },
];

let lastGood: VehiclePosition[] = [];

async function fetchFeed(f: Feed): Promise<VehiclePosition[]> {
  const url = `${BASE}/getCurrentTrainsXML_WithTrainType?TrainType=${f.type}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const xml = await res.text();
  const doc = parser.parse(xml);

  // <ArrayOfObjTrainPositions><objTrainPositions>...</objTrainPositions>...
  const rootKey = Object.keys(doc).find((k) => k.toLowerCase().includes("arrayof"));
  const root = rootKey ? doc[rootKey] : undefined;
  const rawList = root?.objTrainPositions ?? [];
  const list = Array.isArray(rawList) ? rawList : [rawList];

  const out: VehiclePosition[] = [];
  for (const t of list) {
    if (!t) continue;
    // Only running trains ("R"); skip Not yet running / Terminated
    if (String(t.TrainStatus) !== "R") continue;
    const lat = Number(t.TrainLatitude);
    const lng = Number(t.TrainLongitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inIreland(lat, lng)) continue;

    const code = String(t.TrainCode ?? "");
    out.push({
      vehicleId: `RAIL-${code}`,
      vehicleLabel: code,
      routeId: f.routeType === "dart" ? "DART" : `IE:${code}`,
      tripId: null,
      latitude: lat,
      longitude: lng,
      // No heading in the feed — the client animator derives it from movement
      // between fixes, which is accurate (the old 0/180 guess pointed arrows wrong).
      bearing: null,
      speedMps: null,
      routeType: f.routeType,
      fetchedAt: new Date().toISOString(),
    });
  }
  return out;
}

export async function GET() {
  try {
    const results = await Promise.allSettled(FEEDS.map(fetchFeed));
    const vehicles = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    // de-dupe by vehicleId
    const seen = new Set<string>();
    const merged = vehicles.filter((v) => (seen.has(v.vehicleId) ? false : seen.add(v.vehicleId)));
    if (merged.length) lastGood = merged;
    return NextResponse.json({ vehicles: merged.length ? merged : lastGood });
  } catch (err) {
    return NextResponse.json({
      vehicles: lastGood,
      error: err instanceof Error ? err.message : "fetch failed",
    });
  }
}
