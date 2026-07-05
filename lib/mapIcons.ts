import type mapboxgl from "mapbox-gl";
import { ROUTE_COLORS, type RouteType } from "@/types/vehicle";

// Canvas-drawn vehicle pucks, registered as map images at 2x pixel ratio.
// Each route type gets two variants:
//   arrow-<type> — teardrop pointing up (north); the symbol layer rotates it
//                  to the live bearing so the nose shows direction of travel
//   dot-<type>   — plain puck for vehicles with no known heading yet

const SIZE = 64; // 2x canvas → 32px logical
const TYPES: RouteType[] = ["bus", "dart", "rail", "luasRed", "luasGreen", "unknown"];

function drawPuck(color: string, withNose: boolean): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;

  const cx = SIZE / 2;
  const cy = withNose ? 38 : SIZE / 2;
  const r = 16;

  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.beginPath();
  if (withNose) {
    // Teardrop: tip at the top, tangent lines meeting a circle below.
    // Contact angles for tip distance d from centre: ±acos(r/d) around "up".
    const tipY = 6;
    const d = cy - tipY;
    const a = Math.acos(r / d);
    const a1 = -Math.PI / 2 - a;
    const a2 = -Math.PI / 2 + a;
    ctx.moveTo(cx, tipY);
    ctx.lineTo(cx + r * Math.cos(a1), cy + r * Math.sin(a1));
    ctx.arc(cx, cy, r, a1, a2, true); // long way round through the bottom
    ctx.closePath();
  } else {
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.fillStyle = color;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // Small white core so the puck reads as "live" at a glance.
  ctx.beginPath();
  ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();

  return ctx.getImageData(0, 0, SIZE, SIZE);
}

export function addVehicleIcons(map: mapboxgl.Map): void {
  for (const t of TYPES) {
    const color = ROUTE_COLORS[t];
    if (!map.hasImage(`arrow-${t}`)) {
      map.addImage(`arrow-${t}`, drawPuck(color, true), { pixelRatio: 2 });
    }
    if (!map.hasImage(`dot-${t}`)) {
      map.addImage(`dot-${t}`, drawPuck(color, false), { pixelRatio: 2 });
    }
  }
}
