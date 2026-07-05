# Dublin Live — Web

A responsive web port of the Dublin Live Flutter app. Shows **live Dublin transport on a Mapbox map**: buses (TFI GTFS-RT), DART & rail (Irish Rail), and Luas red/green lines — all refreshing every 15 seconds.

## Stack

- **Next.js 15 (App Router)** — client + secure API proxies in one Vercel deploy
- **TypeScript** (strict) · **Tailwind CSS** · **Zustand** (state) · **Mapbox GL JS** (map)

## Why the API proxies exist

The transport feeds (`api.nationaltransport.ie`, `api.irishrail.ie`, `luasforecasts.rpa.ie`) send **no CORS headers** and the TFI feed needs a secret key. A browser can't call them directly. So the browser calls **our own** same-origin routes, which run server-side on Vercel, hold the secret key, fetch the upstream feed, and parse protobuf/XML into JSON:

| Route | Source | Format | Auth |
|---|---|---|---|
| `/api/vehicles` | TFI GTFS-RT `/Vehicles` | protobuf | `TFI_API_KEY` (server) |
| `/api/rail` | Irish Rail realtime | XML | none |
| `/api/luas` | RPA Luas forecasts | XML | none |

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000
```

## Environment variables

`.env.local` (and the same in Vercel → Settings → Environment Variables):

```bash
# Public — safe in the browser. Restrict this token to your domain in the Mapbox dashboard.
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk....

# Server-only — NEVER prefix with NEXT_PUBLIC_. Read only inside app/api routes.
TFI_API_KEY=...
HERE_API_KEY=...          # reserved for journey planning (routes tab)
```

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **New Project → import the repo** (framework auto-detected as Next.js).
3. Add the 3 env vars above under **Settings → Environment Variables** (all environments).
4. **Deploy.** Done — live map at your Vercel URL.

> Or from the CLI: `npm i -g vercel && vercel && vercel --prod`

## Map ↔ Flutter parity

| Flutter | Web |
|---|---|
| `shell_screen.dart` (5 tabs) | `components/AppShell.tsx` + `app/(shell)/*` |
| `map_screen.dart` | `components/map/LiveMap.tsx` |
| `vehicles_provider.dart` | `stores/useVehiclesStore.ts` (15s polling) |
| `gtfs_rt_service.dart` + parser | `app/api/vehicles/route.ts` |
| `irish_rail_service.dart` | `app/api/rail/route.ts` |
| `luas_service.dart` | `app/api/luas/route.ts` |
| `app_colors.dart` | `tailwind.config.ts` + `types/vehicle.ts` |

## Status

- ✅ **Live Map** — fully migrated (buses, DART, rail, Luas, filters, legend, vehicle detail)
- 🔜 Routes / Saved / Alerts / Account — scaffolded tabs, ready to build out next

## ⚠️ Security

The `TFI_API_KEY` and `HERE_API_KEY` were shared in plaintext during development — **rotate them** before going live (regenerate at developer.nationaltransport.ie and the HERE console). Lock the Mapbox `pk.` token to your Vercel domain.
