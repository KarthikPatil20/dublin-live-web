import type mapboxgl from "mapbox-gl";
import { ROUTE_COLORS, type RouteType } from "@/types/vehicle";

// Canvas-drawn top-down vehicle silhouettes (flightradar-style), registered as
// map images at 2x pixel ratio. All shapes are drawn pointing north; the symbol
// layer rotates them to the live bearing so the vehicle "drives" its heading.
//   veh-<type> — bus / train / tram silhouette in livery color
//   dot-<type> — small puck for vehicles with no known heading yet

const SIZE = 96; // 2x canvas → 48px logical
const DOT_SIZE = 64; // 2x canvas → 32px logical
const TYPES: RouteType[] = ["bus", "dart", "rail", "luasRed", "luasGreen", "unknown"];

const GLASS = "rgba(8, 14, 24, 0.6)"; // windshield / window tint

function makeCanvas(size: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas.getContext("2d")!;
}

function withShadow(ctx: CanvasRenderingContext2D, draw: () => void): void {
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 3;
  draw();
  ctx.shadowColor = "transparent";
}

/** Top-down bus: rounded body, windshield up front, roof unit in the middle. */
function drawBus(color: string): ImageData {
  const ctx = makeCanvas(SIZE);

  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.roundRect(30, 12, 36, 72, [14, 14, 9, 9]);
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // windshield (marks the front)
  ctx.beginPath();
  ctx.roundRect(35, 18, 26, 10, 4);
  ctx.fillStyle = GLASS;
  ctx.fill();

  // roof unit
  ctx.beginPath();
  ctx.roundRect(38, 40, 20, 20, 5);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fill();

  // rear window
  ctx.beginPath();
  ctx.roundRect(37, 72, 22, 6, 3);
  ctx.fillStyle = GLASS;
  ctx.fill();

  return ctx.getImageData(0, 0, SIZE, SIZE);
}

/** Top-down train: long body, tapered nose, carriage split. */
function drawTrain(color: string): ImageData {
  const ctx = makeCanvas(SIZE);

  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.roundRect(32, 6, 32, 84, [16, 16, 8, 8]);
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // cab windshield
  ctx.beginPath();
  ctx.roundRect(38, 13, 20, 8, 3);
  ctx.fillStyle = GLASS;
  ctx.fill();

  // carriage coupling gap
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(33, 46, 30, 4);

  // roof stripe on each carriage
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  ctx.roundRect(40, 26, 16, 14, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(40, 58, 16, 20, 4);
  ctx.fill();

  return ctx.getImageData(0, 0, SIZE, SIZE);
}

/** Top-down tram: shorter body rounded at both ends. */
function drawTram(color: string): ImageData {
  const ctx = makeCanvas(SIZE);

  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.roundRect(33, 12, 30, 72, 15);
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  // windshield
  ctx.beginPath();
  ctx.roundRect(38, 18, 20, 8, 3);
  ctx.fillStyle = GLASS;
  ctx.fill();

  // articulation joint
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(34, 46, 28, 4);

  // pantograph bar
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(39, 60, 18, 3);

  return ctx.getImageData(0, 0, SIZE, SIZE);
}

/** Plain puck for vehicles with no heading yet. */
function drawDot(color: string): ImageData {
  const ctx = makeCanvas(DOT_SIZE);
  const c = DOT_SIZE / 2;

  withShadow(ctx, () => {
    ctx.beginPath();
    ctx.arc(c, c, 16, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(c, c, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();

  return ctx.getImageData(0, 0, DOT_SIZE, DOT_SIZE);
}

const SILHOUETTE: Record<RouteType, (color: string) => ImageData> = {
  bus: drawBus,
  dart: drawTrain,
  rail: drawTrain,
  luasRed: drawTram,
  luasGreen: drawTram,
  unknown: drawBus,
};

export function addVehicleIcons(map: mapboxgl.Map): void {
  for (const t of TYPES) {
    const color = ROUTE_COLORS[t];
    if (!map.hasImage(`veh-${t}`)) {
      map.addImage(`veh-${t}`, SILHOUETTE[t](color), { pixelRatio: 2 });
    }
    if (!map.hasImage(`dot-${t}`)) {
      map.addImage(`dot-${t}`, drawDot(color), { pixelRatio: 2 });
    }
  }
}
