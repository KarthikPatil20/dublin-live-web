import type { RouteType, VehiclePosition } from "@/types/vehicle";

// Smooth-motion engine for vehicle markers.
//
// GPS fixes arrive every ~15s per feed. Rendering them directly makes markers
// teleport (or appear frozen between polls). Instead, each vehicle keeps:
//   - a position transition: rendered position glides linearly from where it
//     was drawn last toward the newest fix over TRANSITION_MS
//   - dead-reckoning: once the transition lands, the vehicle keeps advancing
//     along its bearing at its estimated speed (capped) until the next fix
//   - a bearing transition: shortest-arc rotation so arrows swing, not snap
//
// frame(now) is called from the map's requestAnimationFrame loop and returns
// a GeoJSON FeatureCollection of the interpolated fleet.

const TRANSITION_MS = 10_000; // glide toward each new fix over ~2/3 of the poll cycle
const BEARING_MS = 1_200; // arrow rotation time
const MAX_DEAD_RECKON_M = 200; // never extrapolate further than this past a fix
const MIN_MOVE_FOR_HEADING_M = 12; // ignore GPS jitter when deriving headings
const MAX_SPEED_MPS = 38; // sanity clamp (~135 km/h, faster than any DART)
const STALE_DROP_MS = 60_000; // drop vehicles missing from the feed this long

const DEG = Math.PI / 180;
const M_PER_DEG_LAT = 111_320;

interface AnimVehicle {
  id: string;
  routeId: string;
  routeType: RouteType;
  label: string;
  // position transition (from → to over [start, start+TRANSITION_MS])
  fromLng: number;
  fromLat: number;
  toLng: number;
  toLat: number;
  transStart: number;
  // bearing transition (shortest-arc from → to over BEARING_MS)
  fromBearing: number;
  toBearing: number;
  bearingStart: number;
  hasBearing: boolean;
  // dead-reckoning inputs
  speedMps: number;
  // bookkeeping
  lastFixLng: number;
  lastFixLat: number;
  lastFixAt: number;
  lastSeen: number;
}

export interface VehicleSnapshot {
  vehicleId: string;
  routeId: string;
  routeType: RouteType;
  label: string;
  lat: number;
  lng: number;
  bearing: number;
  hasBearing: boolean;
  speedKmh: number;
  fixAgeMs: number;
}

function metersBetween(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const x = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * DEG) * M_PER_DEG_LAT;
  const y = (lat2 - lat1) * M_PER_DEG_LAT;
  return Math.hypot(x, y);
}

function headingDeg(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const y = (lng2 - lng1) * Math.cos(((lat1 + lat2) / 2) * DEG);
  const x = lat2 - lat1;
  return (Math.atan2(y, x) / DEG + 360) % 360;
}

function shortestArc(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180; // in (-180, 180]
}

class VehicleAnimator {
  private vehicles = new Map<string, AnimVehicle>();
  private lastData: VehiclePosition[] | null = null;

  /** Feed a fresh poll result. Safe to call with the same array twice. */
  setData(data: VehiclePosition[]): void {
    if (data === this.lastData) return;
    this.lastData = data;
    const now = performance.now();

    for (const fix of data) {
      const prev = this.vehicles.get(fix.vehicleId);
      if (!prev) {
        this.vehicles.set(fix.vehicleId, {
          id: fix.vehicleId,
          routeId: fix.routeId,
          routeType: fix.routeType,
          label: fix.vehicleLabel || fix.routeId, // feed sends "" not null
          fromLng: fix.longitude,
          fromLat: fix.latitude,
          toLng: fix.longitude,
          toLat: fix.latitude,
          transStart: now - TRANSITION_MS, // already settled
          fromBearing: fix.bearing ?? 0,
          toBearing: fix.bearing ?? 0,
          bearingStart: now,
          hasBearing: fix.bearing != null,
          speedMps: Math.min(fix.speedMps ?? 0, MAX_SPEED_MPS),
          lastFixLng: fix.longitude,
          lastFixLat: fix.latitude,
          lastFixAt: now,
          lastSeen: now,
        });
        continue;
      }

      prev.lastSeen = now;
      prev.routeId = fix.routeId;
      prev.label = fix.vehicleLabel || fix.routeId;

      const moved = metersBetween(prev.lastFixLng, prev.lastFixLat, fix.longitude, fix.latitude);
      if (moved < 1) {
        // Same fix re-served (rate-limit cache) — keep gliding, don't restart.
        continue;
      }

      // Restart the position glide from wherever the marker is drawn right now.
      const [curLng, curLat] = this.positionAt(prev, now);
      prev.fromLng = curLng;
      prev.fromLat = curLat;
      prev.toLng = fix.longitude;
      prev.toLat = fix.latitude;
      prev.transStart = now;

      // Heading: prefer the feed's bearing, else derive from real displacement.
      const derived =
        moved >= MIN_MOVE_FOR_HEADING_M
          ? headingDeg(prev.lastFixLng, prev.lastFixLat, fix.longitude, fix.latitude)
          : null;
      const target = fix.bearing ?? derived;
      if (target != null) {
        prev.fromBearing = this.bearingAt(prev, now);
        prev.toBearing = target;
        prev.bearingStart = now;
        prev.hasBearing = true;
      }

      // Speed: feed value, else estimate from displacement between fixes.
      const dtSec = Math.max((now - prev.lastFixAt) / 1000, 1);
      const estimated = moved / dtSec;
      prev.speedMps = Math.min(fix.speedMps ?? estimated, MAX_SPEED_MPS);

      prev.lastFixLng = fix.longitude;
      prev.lastFixLat = fix.latitude;
      prev.lastFixAt = now;
    }

    // Prune vehicles the feed stopped reporting a while ago.
    for (const [id, v] of this.vehicles) {
      if (now - v.lastSeen > STALE_DROP_MS) this.vehicles.delete(id);
    }
  }

  private positionAt(v: AnimVehicle, now: number): [number, number] {
    const t = (now - v.transStart) / TRANSITION_MS;
    if (t < 1) {
      return [v.fromLng + (v.toLng - v.fromLng) * t, v.fromLat + (v.toLat - v.fromLat) * t];
    }
    // Transition landed on the fix — dead-reckon along the bearing.
    if (!v.hasBearing || v.speedMps < 0.5) return [v.toLng, v.toLat];
    const overSec = ((now - v.transStart) - TRANSITION_MS) / 1000;
    const dist = Math.min(v.speedMps * overSec, MAX_DEAD_RECKON_M);
    const rad = v.toBearing * DEG;
    return [
      v.toLng + (dist * Math.sin(rad)) / (M_PER_DEG_LAT * Math.cos(v.toLat * DEG)),
      v.toLat + (dist * Math.cos(rad)) / M_PER_DEG_LAT,
    ];
  }

  private bearingAt(v: AnimVehicle, now: number): number {
    const t = Math.min((now - v.bearingStart) / BEARING_MS, 1);
    return (v.fromBearing + shortestArc(v.fromBearing, v.toBearing) * t + 360) % 360;
  }

  /** Build the interpolated frame for the map. */
  frame(now: number): GeoJSON.FeatureCollection<GeoJSON.Point> {
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    for (const v of this.vehicles.values()) {
      const [lng, lat] = this.positionAt(v, now);
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          vehicleId: v.id,
          routeType: v.routeType,
          routeId: v.routeId,
          label: v.label,
          bearing: this.bearingAt(v, now),
          hasBearing: v.hasBearing,
        },
      });
    }
    return { type: "FeatureCollection", features };
  }

  /** Live values for the detail sheet / follow mode. */
  getSnapshot(vehicleId: string): VehicleSnapshot | null {
    const v = this.vehicles.get(vehicleId);
    if (!v) return null;
    const now = performance.now();
    const [lng, lat] = this.positionAt(v, now);
    return {
      vehicleId: v.id,
      routeId: v.routeId,
      routeType: v.routeType,
      label: v.label,
      lat,
      lng,
      bearing: this.bearingAt(v, now),
      hasBearing: v.hasBearing,
      speedKmh: Math.round(v.speedMps * 3.6),
      fixAgeMs: now - v.lastFixAt,
    };
  }

  clear(): void {
    this.vehicles.clear();
    this.lastData = null;
  }
}

export const vehicleAnimator = new VehicleAnimator();
