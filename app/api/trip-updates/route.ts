import { NextResponse } from "next/server";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { TFI_BASE_URL } from "@/lib/constants";
import { routeTypeFromId, type RouteType } from "@/types/vehicle";

// Server-side proxy for the TFI GTFS-RT TripUpdates feed (protobuf).
// Powers two things:
//   1. ?view=alerts  → per-route delay summary (ported from gtfs_rt_alerts_service.dart)
//   2. ?trip=<id>    → the stop-time list for one trip (for the vehicle journey sheet)
// Same TFI_API_KEY, same resilience pattern as /api/vehicles.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DELAY_THRESHOLD_S = 60; // a trip counts as "late" past this (matches the Flutter app)

export interface RouteAlert {
  routeId: string; // cleaned, human route (e.g. "15", "46A", "DART")
  routeType: RouteType;
  lateTrips: number; // trips delayed > threshold
  totalTrips: number;
  maxDelaySec: number; // worst delay on the route right now
}

export interface StopTime {
  stopId: string;
  stopSequence: number;
  arrivalDelaySec: number | null;
  arrivalTime: number | null; // unix seconds
  departureTime: number | null;
}

// Cache the last good decode so alerts survive a 429 and we don't re-fetch for
// every ?trip lookup within a few seconds.
let cache: { at: number; feed: GtfsRealtimeBindings.transit_realtime.FeedMessage } | null = null;
const CACHE_MS = 20_000;

// TFI GTFS route_ids look like "2 40 d", "2 220 c b", "2 109X d", "1 E1 a" —
// a leading agency/direction digit, then the PUBLIC route short-name as the
// second token, then internal suffixes. Named coach/rail services instead look
// like "DUB-TRALEE-O" or "BRAY-HOWTH-I" (no leading digit group).
function cleanRouteId(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  // Named service (contains a hyphen and no space) → tidy it up as-is.
  if (s.includes("-") && !s.includes(" ")) {
    return s.replace(/-[IO]$/, "").replace(/-/g, " · ");
  }
  const parts = s.split(/\s+/);
  // "<agency> <route> <suffix...>" → the route short-name is token[1].
  if (parts.length >= 2 && /^[0-9]$/.test(parts[0])) {
    return parts[1].toUpperCase();
  }
  // Fallback: first token that looks like a route code.
  const candidate = parts.find((p) => /^[0-9]{1,3}[A-Za-z]?$/.test(p)) ?? parts[0];
  return candidate.toUpperCase();
}

async function getFeed(apiKey: string) {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.feed;
  const res = await fetch(`${TFI_BASE_URL}/TripUpdates`, {
    headers: { "x-api-key": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
  });
  if (res.status === 429 && cache) return cache.feed; // serve stale on rate limit
  if (!res.ok) throw new Error(`TripUpdates ${res.status}`);
  const buffer = new Uint8Array(await res.arrayBuffer());
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);
  cache = { at: Date.now(), feed };
  return feed;
}

export async function GET(req: Request) {
  const apiKey = process.env.TFI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TFI_API_KEY not configured" }, { status: 500 });
  }
  const url = new URL(req.url);
  const view = url.searchParams.get("view");
  const trip = url.searchParams.get("trip");

  let feed: GtfsRealtimeBindings.transit_realtime.FeedMessage;
  try {
    feed = await getFeed(apiKey);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "fetch failed", alerts: [], stopTimes: [] },
      { status: 200 },
    );
  }

  // ---- single-trip stop times (for the vehicle journey sheet) ----
  if (trip) {
    for (const e of feed.entity) {
      const tu = e.tripUpdate;
      if (tu?.trip?.tripId !== trip) continue;
      const stopTimes: StopTime[] = (tu.stopTimeUpdate ?? []).map((s) => ({
        stopId: s.stopId ?? "",
        stopSequence: s.stopSequence ?? 0,
        arrivalDelaySec: s.arrival?.delay ?? s.departure?.delay ?? null,
        arrivalTime: s.arrival?.time != null ? Number(s.arrival.time) : null,
        departureTime: s.departure?.time != null ? Number(s.departure.time) : null,
      }));
      return NextResponse.json({
        tripId: trip,
        routeId: cleanRouteId(tu.trip?.routeId ?? ""),
        stopTimes,
      });
    }
    return NextResponse.json({ tripId: trip, stopTimes: [] });
  }

  // ---- per-route delay summary (Alerts tab) ----
  const byRoute = new Map<string, RouteAlert>();
  for (const e of feed.entity) {
    const tu = e.tripUpdate;
    if (!tu?.trip) continue;
    const rawRoute = tu.trip.routeId ?? "";
    const routeId = cleanRouteId(rawRoute);
    let maxDelay = 0;
    for (const s of tu.stopTimeUpdate ?? []) {
      const d = s.arrival?.delay ?? s.departure?.delay ?? 0;
      if (Math.abs(d) > Math.abs(maxDelay)) maxDelay = d;
    }
    const key = routeId || rawRoute;
    const cur =
      byRoute.get(key) ??
      ({
        routeId,
        routeType: routeTypeFromId(rawRoute),
        lateTrips: 0,
        totalTrips: 0,
        maxDelaySec: 0,
      } satisfies RouteAlert);
    cur.totalTrips++;
    if (Math.abs(maxDelay) > DELAY_THRESHOLD_S) cur.lateTrips++;
    if (maxDelay > cur.maxDelaySec) cur.maxDelaySec = maxDelay;
    byRoute.set(key, cur);
  }

  const alerts = [...byRoute.values()]
    .filter((a) => a.lateTrips > 0)
    .sort((a, b) => b.maxDelaySec - a.maxDelaySec || b.lateTrips - a.lateTrips);

  return NextResponse.json({
    alerts,
    generatedAt: Date.now(),
    feedTrips: feed.entity.length,
  });
}
