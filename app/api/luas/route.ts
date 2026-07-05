import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { LUAS_STOPS } from "@/lib/luasStops";

// Server-side proxy replacing lib/services/luas_service.dart.
// The RPA forecast API returns arrivals per stop (not tram GPS), so we return the stop
// network + next-tram-due info per line. The map renders the two lines and highlights
// stops with imminent trams.

export const dynamic = "force-dynamic";
export const revalidate = 0;

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

export interface LuasArrival {
  code: string;
  name: string;
  lat: number;
  lng: number;
  line: "red" | "green";
  nextDueMins: number | null; // soonest tram either direction
  destination: string | null;
}

function forecastUrl(code: string) {
  return `https://luasforecasts.rpa.ie/xml/get.ashx?action=forecast&stop=${code}&encrypt=false`;
}

async function fetchStop(stop: (typeof LUAS_STOPS)[number]): Promise<LuasArrival> {
  const base: LuasArrival = {
    code: stop.code,
    name: stop.name,
    lat: stop.lat,
    lng: stop.lng,
    line: stop.line,
    nextDueMins: null,
    destination: null,
  };
  try {
    const res = await fetch(forecastUrl(stop.code), {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return base;
    const doc = parser.parse(await res.text());
    const directions = doc?.stopInfo?.direction;
    const dirs = Array.isArray(directions) ? directions : directions ? [directions] : [];
    let soonest: number | null = null;
    let dest: string | null = null;
    for (const d of dirs) {
      const trams = Array.isArray(d.tram) ? d.tram : d.tram ? [d.tram] : [];
      for (const tram of trams) {
        const due = tram["@_dueMins"];
        const mins = due === "DUE" ? 0 : Number(due);
        if (Number.isFinite(mins) && (soonest === null || mins < soonest)) {
          soonest = mins;
          dest = tram["@_destination"] ?? null;
        }
      }
    }
    return { ...base, nextDueMins: soonest, destination: dest };
  } catch {
    return base;
  }
}

export async function GET() {
  // Query a subset each call would be ideal for rate limits, but the network is small.
  // Fetch all stops concurrently with individual timeouts.
  const results = await Promise.allSettled(LUAS_STOPS.map(fetchStop));
  const stops = results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          ...LUAS_STOPS[i],
          nextDueMins: null,
          destination: null,
        },
  );
  return NextResponse.json({ stops });
}
