"use client";

import dynamic from "next/dynamic";

// Mapbox GL must run client-side only — ssr:false is allowed here (client component).
const LiveMap = dynamic(() => import("@/components/map/LiveMap"), { ssr: false });

export default function LiveMapClient() {
  return <LiveMap />;
}
