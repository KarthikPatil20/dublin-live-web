import { NextResponse } from "next/server";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { TFI_BASE_URL, inIreland } from "@/lib/constants";
import { routeTypeFromId, type VehiclePosition } from "@/types/vehicle";

// Server-side proxy replacing lib/services/gtfs/gtfs_rt_service.dart + gtfs_rt_parser.dart.
// Runs on Vercel serverless — TFI_API_KEY never reaches the browser, and there's no CORS
// because the browser calls this same-origin route.

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Small in-memory cache to survive TFI 429 rate limits (mirrors _lastGoodResult in Dart)
let lastGood: VehiclePosition[] = [];
let lastGoodAt = 0;

export async function GET() {
  const apiKey = process.env.TFI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TFI_API_KEY not configured on server" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${TFI_BASE_URL}/Vehicles`, {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 429) {
      // rate limited — serve last good snapshot
      return NextResponse.json({ vehicles: lastGood, cached: true, reason: "rate-limited" });
    }
    if (!res.ok) {
      return NextResponse.json({ vehicles: lastGood, cached: true, status: res.status });
    }

    const buffer = new Uint8Array(await res.arrayBuffer());
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

    const vehicles: VehiclePosition[] = [];
    for (const entity of feed.entity) {
      const v = entity.vehicle;
      const pos = v?.position;
      if (!v || !pos) continue;

      const lat = pos.latitude;
      const lng = pos.longitude;
      if (lat == null || lng == null || !inIreland(lat, lng)) continue;

      const routeId = v.trip?.routeId ?? "";
      vehicles.push({
        vehicleId: v.vehicle?.id ?? entity.id,
        vehicleLabel: v.vehicle?.label ?? null,
        routeId,
        tripId: v.trip?.tripId ?? null,
        latitude: lat,
        longitude: lng,
        bearing: pos.bearing ?? null,
        speedMps: pos.speed ?? null,
        routeType: routeTypeFromId(routeId),
        fetchedAt: new Date().toISOString(),
      });
    }

    lastGood = vehicles;
    lastGoodAt = Date.now();
    return NextResponse.json({ vehicles, cached: false });
  } catch (err) {
    // network/timeout — fall back to cache
    return NextResponse.json({
      vehicles: lastGood,
      cached: true,
      error: err instanceof Error ? err.message : "fetch failed",
      lastGoodAt,
    });
  }
}
