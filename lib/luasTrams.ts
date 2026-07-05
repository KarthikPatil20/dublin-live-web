import type { LuasArrival } from "@/app/api/luas/route";
import { LUAS_SEGMENTS, type LuasStop } from "@/lib/luasStops";

// The RPA feed gives per-stop arrival times, NOT tram GPS. To visualise "where the
// trams are", we synthesise a position for each forecast tram by placing it back
// along the track from the stop it's approaching, proportional to its due time.
// This is an ESTIMATE derived from real arrival data — labelled as such on the map.

const KMH = 35; // typical Luas running speed for back-projecting distance from ETA

export interface SyntheticTram {
  id: string;
  line: "red" | "green";
  lng: number;
  lat: number;
  dueMins: number;
  destination: string;
  towardStop: string;
}

// --- geometry helpers ---
function segKm(a: LuasStop, b: LuasStop): number {
  const dx = (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180) * 111;
  const dy = (a.lat - b.lat) * 111;
  return Math.hypot(dx, dy);
}

// Walk `distKm` back from `stopIndex` along the ordered stop list (toward lower
// indices for inbound-ish, higher for outbound). Returns an interpolated point.
function pointBackFrom(
  stops: LuasStop[],
  stopIndex: number,
  distKm: number,
  approachFromHigherIndex: boolean,
): { lng: number; lat: number } {
  let remaining = distKm;
  let i = stopIndex;
  const dir = approachFromHigherIndex ? 1 : -1; // which way the tram is coming from
  while (remaining > 0) {
    const next = i + dir;
    if (next < 0 || next >= stops.length) {
      return { lng: stops[i].lng, lat: stops[i].lat }; // clamp at terminus
    }
    const d = segKm(stops[i], stops[next]);
    if (d >= remaining) {
      const t = remaining / d;
      return {
        lng: stops[i].lng + (stops[next].lng - stops[i].lng) * t,
        lat: stops[i].lat + (stops[next].lat - stops[i].lat) * t,
      };
    }
    remaining -= d;
    i = next;
  }
  return { lng: stops[i].lng, lat: stops[i].lat };
}

// Build one synthetic tram per line+direction from the SOONEST inbound and
// outbound forecast at each stop, de-duplicated so we don't stack trams that are
// really the same vehicle seen from adjacent stops.
export function synthesiseTrams(arrivals: LuasArrival[]): SyntheticTram[] {
  const byCode = new Map<string, LuasArrival>();
  for (const a of arrivals) byCode.set(a.code, a);

  const trams: SyntheticTram[] = [];
  const claimed = new Set<string>(); // dedupe key: line|direction|terminalBucket

  for (const seg of LUAS_SEGMENTS) {
    const stops = seg.stops;
    for (let idx = 0; idx < stops.length; idx++) {
      const arr = byCode.get(stops[idx].code);
      if (!arr || arr.trams.length === 0) continue;

      // one tram per direction: the soonest not-yet-arrived forecast
      for (const direction of ["inbound", "outbound"] as const) {
        const next = arr.trams
          .filter((t) => t.direction === direction && t.dueMins >= 0 && t.dueMins <= 20)
          .sort((a, b) => a.dueMins - b.dueMins)[0];
        if (!next) continue;

        // Estimate distance back from this stop from the ETA.
        const distKm = (next.dueMins / 60) * KMH;
        // Inbound trams approach a stop from the higher-index (outbound) side on the
        // Green line list ordering; we approximate: inbound comes from higher index.
        const approachFromHigher = direction === "inbound";
        const p = pointBackFrom(stops, idx, distKm, approachFromHigher);

        // Dedupe: bucket by estimated arrival time at THIS stop, rounded to 3 min,
        // so the same tram reported at neighbouring stops collapses to one.
        const bucket = Math.round(next.dueMins / 3);
        const key = `${seg.line}|${direction}|${next.destination}|${bucket}`;
        if (claimed.has(key)) continue;
        claimed.add(key);

        trams.push({
          id: key,
          line: seg.line,
          lng: p.lng,
          lat: p.lat,
          dueMins: next.dueMins,
          destination: next.destination,
          towardStop: stops[idx].name,
        });
      }
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
        label: `${t.destination}${t.dueMins <= 0 ? " · DUE" : ` · ${t.dueMins}m`}`,
        towardStop: t.towardStop,
      },
    })),
  };
}
