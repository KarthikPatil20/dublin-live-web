import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RouteType } from "@/types/vehicle";

// Saved routes/stops, persisted to localStorage.
// Ported in spirit from favourites_provider.dart + saved_locations_provider.dart.

export interface Favourite {
  id: string; // stable key, e.g. "route:bus:46A" or "stop:luas:STS"
  kind: "route" | "stop";
  label: string;
  routeType?: RouteType;
  routeId?: string;
  lng?: number;
  lat?: number;
  addedAt: number;
}

interface FavState {
  favourites: Favourite[];
  add: (f: Omit<Favourite, "addedAt">) => void;
  remove: (id: string) => void;
  toggle: (f: Omit<Favourite, "addedAt">) => void;
  has: (id: string) => boolean;
}

export const useFavouritesStore = create<FavState>()(
  persist(
    (set, get) => ({
      favourites: [],
      add: (f) =>
        set((s) =>
          s.favourites.some((x) => x.id === f.id)
            ? s
            : { favourites: [{ ...f, addedAt: Date.now() }, ...s.favourites] },
        ),
      remove: (id) => set((s) => ({ favourites: s.favourites.filter((x) => x.id !== id) })),
      toggle: (f) =>
        get().has(f.id) ? get().remove(f.id) : get().add(f),
      has: (id) => get().favourites.some((x) => x.id === id),
    }),
    { name: "dublinlive.favourites" },
  ),
);
