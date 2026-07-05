"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useThemeStore } from "@/stores/useThemeStore";
import { useVehiclesStore } from "@/stores/useVehiclesStore";
import { useFavouritesStore } from "@/stores/useFavouritesStore";

export default function AccountPage() {
  const { theme, toggle, init } = useThemeStore();
  const start = useVehiclesStore((s) => s.start);
  const vehicles = useVehiclesStore((s) => s.vehicles);
  const luasStops = useVehiclesStore((s) => s.luasStops);
  const error = useVehiclesStore((s) => s.error);
  const savedCount = useFavouritesStore((s) => s.favourites.length);

  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  useEffect(() => {
    init();
    start();
    const u = localStorage.getItem("dublinlive.units") as "metric" | "imperial" | null;
    if (u) setUnits(u);
  }, [init, start]);

  const setUnitsPref = (u: "metric" | "imperial") => {
    setUnits(u);
    localStorage.setItem("dublinlive.units", u);
  };

  return (
    <div className="mx-auto flex h-full max-w-md flex-col overflow-y-auto p-6">
      <h1 className="mb-1 text-2xl font-bold text-light-text dark:text-dark-text">Account</h1>
      <p className="mb-6 text-sm text-light-muted dark:text-dark-muted">Preferences &amp; live status.</p>

      {/* Live network status */}
      <Card title="Network status">
        <div className="grid grid-cols-3 gap-2">
          <Metric value={vehicles.length} label="Vehicles live" />
          <Metric value={luasStops.length} label="Luas stops" />
          <Metric value={savedCount} label="Saved" />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: error ? "#D97706" : "#16A34A" }}
          />
          <span className="text-light-muted dark:text-dark-muted">
            {error ? "Some feeds are degraded — showing last good data" : "All feeds connected"}
          </span>
        </div>
      </Card>

      {/* Theme */}
      <Card title="Appearance">
        <Setting
          label="Theme"
          desc={`${theme === "dark" ? "Dark" : "Light"} mode`}
          action={
            <button
              onClick={toggle}
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Switch to {theme === "dark" ? "Light" : "Dark"}
            </button>
          }
        />
      </Card>

      {/* Units */}
      <Card title="Units">
        <div className="flex gap-2">
          {(["metric", "imperial"] as const).map((u) => (
            <button
              key={u}
              onClick={() => setUnitsPref(u)}
              className={
                "flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors " +
                (units === u
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-light-border text-light-muted hover:bg-black/5 dark:border-dark-border dark:text-dark-muted dark:hover:bg-white/5")
              }
            >
              {u === "metric" ? "Metric (km)" : "Imperial (mi)"}
            </button>
          ))}
        </div>
      </Card>

      {/* About */}
      <Card title="About">
        <p className="text-sm text-light-muted dark:text-dark-muted">
          Dublin Live shows real-time positions for Dublin Bus, DART, Irish Rail and Luas,
          sourced from Transport for Ireland (GTFS-RT), Irish Rail and the RPA Luas feeds.
        </p>
        <p className="mt-2 text-sm text-light-muted dark:text-dark-muted">
          Data is live and best-effort — arrival predictions come straight from the operators.
        </p>
        <Link href="/" className="mt-3 inline-block text-sm font-medium text-primary underline">
          Open the Live Map →
        </Link>
      </Card>

      <p className="mt-2 text-center text-xs text-light-muted dark:text-dark-muted">
        Dublin Live · web
      </p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-light-border bg-light-card p-4 dark:border-dark-border dark:bg-dark-card">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-light-muted dark:text-dark-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Setting({
  label,
  desc,
  action,
}: {
  label: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-light-text dark:text-dark-text">{label}</div>
        <div className="text-sm text-light-muted dark:text-dark-muted">{desc}</div>
      </div>
      {action}
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-light-border bg-light-surface px-2 py-2 text-center dark:border-dark-border dark:bg-dark-surface">
      <div className="text-lg font-bold tabular-nums text-light-text dark:text-dark-text">{value}</div>
      <div className="text-[10px] leading-tight text-light-muted dark:text-dark-muted">{label}</div>
    </div>
  );
}
