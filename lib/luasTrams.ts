import type { LuasArrival } from "@/app/api/luas/route";
import { LUAS_STOPS } from "@/lib/luasStops";
import { LUAS_TRACK } from "@/lib/luasTrack";

// The RPA feed gives per-stop arrival times, NOT tram GPS. To visualise "where the
// trams are", we synthesise a position for each forecast tram by walking back along
// the REAL track polyline from the stop it's approaching, proportional to its due
// time. This is an ESTIMATE derived from real arrival data — labelled as such.

const KMH = 35; // typical Luas running speed for back-projecting distance from ETA

export interface SyntheticTram {
  id: string;
  line: "red" | "green";
  lng: number;
  lat: number;
  bearing: number;
  dueMins: number;
  destination: string;
  towardStop: string;
}

type Pt = [number, number]; // [lng, lat]

function km(a: Pt, b: Pt): number {
  const dx = (a[0] - b[0]) * Math.cos((a[1] * Math.PI) / 180) * 111;
  const dy = (a[1] - b[1]) * 111;
  return Math.hypot(dx, dy);
}
function bearingDeg(a: Pt, b: Pt): number {
  const y = (b[0] - a[0]) * Math.cos(((a[1] + b[1]) / 2) * (Math.PI / 180));
  const x = b[1] - a[1];
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360;
}

// Precompute cumulative distance along each track once.
const TRACK_INDEX: Record<"red" | "green", { pts: Pt[]; cum: number[] }> = {
  red: buildIndex(LUAS_TRACK.red),
  green: buildIndex(LUAS_TRACK.green),
};
function buildIndex(pts: Pt[]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + km(pts[i - 1], pts[i]);
  return { pts, cum };
}

// Nearest track vertex index to a stop.
function nearestIndex(line: "red" | "green", p: Pt): number {
  const { pts } = TRACK_INDEX[line];
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = km(pts[i], p);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

// Point at a given cumulative distance along the track (metres of the polyline),
// walking `dir` (+1 forward / -1 backward) from `fromIdx` by `distKm`.
function walk(
  line: "red" | "green",
  fromIdx: number,
  distKm: number,
  dir: 1 | -1,
): { p: Pt; bearing: number } {
  const { pts } = TRACK_INDEX[line];
  let remaining = distKm;
  let i = fromIdx;
  while (remaining > 0) {
    const j = i + dir;
    if (j < 0 || j >= pts.length) {
      const a = pts[Math.max(0, Math.min(i, pts.length - 1))];
      const b = pts[Math.max(0, Math.min(i - dir, pts.length - 1))];
      return { p: a, bearing: bearingDeg(b, a) };
    }
    const d = km(pts[i], pts[j]);
    if (d >= remaining) {
      const t = remaining / d;
      const p: Pt = [pts[i][0] + (pts[j][0] - pts[i][0]) * t, pts[i][1] + (pts[j][1] - pts[i][1]) * t];
      return { p, bearing: bearingDeg(pts[i], pts[j]) };
    }
    remaining -= d;
    i = j;
  }
  return { p: pts[i], bearing: 0 };
}

export function synthesiseTrams(arrivals: LuasArrival[]): SyntheticTram[] {
  const byCode = new Map<string, LuasArrival>();
  for (const a of arrivals) byCode.set(a.code, a);

  const trams: SyntheticTram[] = [];
  const claimed = new Set<string>();

  for (const stop of LUAS_STOPS) {
    const arr = byCode.get(stop.code);
    if (!arr || arr.trams.length === 0) continue;
    const line = stop.line;
    const stopIdx = nearestIndex(line, [stop.lng, stop.lat]);

    for (const direction of ["inbound", "outbound"] as const) {
      const next = arr.trams
        .filter((t) => t.direction === direction && t.dueMins >= 0 && t.dueMins <= 20)
        .sort((a, b) => a.dueMins - b.dueMins)[0];
      if (!next) continue;

      // dedupe the same physical tram reported at adjacent stops
      const bucket = Math.round(next.dueMins / 3);
      const key = `${line}|${direction}|${next.destination}|${bucket}`;
      if (claimed.has(key)) continue;
      claimed.add(key);

      const distKm = (next.dueMins / 60) * KMH;
      // Walk back along the track away from the stop. Inbound trams sit toward the
      // higher-index (outer) end; outbound toward the lower-index end. Either way we
      // walk in the direction that INCREASES distance to the terminus it came from.
      const dir: 1 | -1 = direction === "inbound" ? 1 : -1;
      const { p, bearing } = walk(line, stopIdx, distKm, dir);
      // tram faces toward the stop → opposite of the walk-back bearing
      const facing = (bearing + 180) % 360;

      trams.push({
        id: key,
        line,
        lng: p[0],
        lat: p[1],
        bearing: facing,
        dueMins: next.dueMins,
        destination: next.destination,
        towardStop: stop.name,
      });
    }
  }
  return trams;
}

export function tramsToGeoJSON(trams: SyntheticTram[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: trams.map((t) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [t.lng, t.lat] },
      properties: {
        id: t.id,
        line: t.line,
        bearing: t.bearing,
        label: `${t.destination}${t.dueMins <= 0 ? " · DUE" : ` · ${t.dueMins}m`}`,
        towardStop: t.towardStop,
      },
    })),
  };
}
