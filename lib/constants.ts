// Ported from lib/core/constants/app_constants.dart
export const APP_NAME = "Dublin Live";

// Map defaults (Dublin city centre)
export const DUBLIN_CENTER: [number, number] = [-6.2603, 53.3498]; // [lng, lat] for Mapbox
export const DEFAULT_ZOOM = 12;
export const MIN_ZOOM = 8;
export const MAX_ZOOM = 18;

// Refresh interval kept within TFI rate limits (15s in the Flutter app)
export const VEHICLE_REFRESH_MS = 15_000;

// TFI GTFS-RT base (server-side only)
export const TFI_BASE_URL = "https://api.nationaltransport.ie/gtfsr/v2";

// Geographic sanity bounds for Ireland (from gtfs_rt_parser.dart / irish_rail_service.dart)
export const IE_BOUNDS = { minLat: 51.0, maxLat: 55.5, minLng: -11.0, maxLng: -5.0 };

export function inIreland(lat: number, lng: number): boolean {
  return (
    lat >= IE_BOUNDS.minLat &&
    lat <= IE_BOUNDS.maxLat &&
    lng >= IE_BOUNDS.minLng &&
    lng <= IE_BOUNDS.maxLng
  );
}
