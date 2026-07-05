// Ported from lib/models/route_type.dart and lib/models/vehicle_position.dart

export type RouteType =
  | "bus"
  | "dart"
  | "rail"
  | "luasRed"
  | "luasGreen"
  | "unknown";

// Transit livery colors — from app_colors.dart
export const ROUTE_COLORS: Record<RouteType, string> = {
  bus: "#007B40",
  dart: "#00843D",
  rail: "#003D7A",
  luasRed: "#CC0000",
  luasGreen: "#007D3C",
  unknown: "#9CA3AF",
};

export const ROUTE_LABELS: Record<RouteType, string> = {
  bus: "Bus",
  dart: "DART",
  rail: "Rail",
  luasRed: "Luas Red",
  luasGreen: "Luas Green",
  unknown: "Unknown",
};

export const ROUTE_EMOJI: Record<RouteType, string> = {
  bus: "🚌",
  dart: "🚆",
  rail: "🚄",
  luasRed: "🚊",
  luasGreen: "🚊",
  unknown: "❓",
};

// Classification logic ported verbatim from RouteType.fromRouteId()
export function routeTypeFromId(routeId: string): RouteType {
  const id = (routeId || "").toUpperCase();
  if (id.startsWith("DART") || id.includes(":DART")) return "dart";
  if (id.startsWith("GREEN") || id.includes("LUAS:GREEN") || id.includes("LUAS:G"))
    return "luasGreen";
  if (id.startsWith("RED") || id.includes("LUAS:RED") || id.includes("LUAS:R"))
    return "luasRed";
  if (
    id.startsWith("IE:") ||
    id.startsWith("RAIL") ||
    id.startsWith("EER") ||
    id.startsWith("EC")
  )
    return "rail";
  return "bus";
}

export interface VehiclePosition {
  vehicleId: string;
  vehicleLabel?: string | null;
  routeId: string;
  tripId?: string | null;
  latitude: number;
  longitude: number;
  bearing?: number | null;
  speedMps?: number | null;
  routeType: RouteType;
  fetchedAt: string; // ISO
}

export function speedKmh(v: VehiclePosition): number | null {
  return v.speedMps != null ? Math.round(v.speedMps * 3.6) : null;
}
