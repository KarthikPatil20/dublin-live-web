"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useAlertsStore } from "@/stores/useAlertsStore";
import { ROUTE_COLORS, ROUTE_LABELS, type RouteType } from "@/types/vehicle";
import type { RouteAlert } from "@/app/api/trip-updates/route";

type ModeFilter = "all" | RouteType;

const MODES: { key: ModeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bus", label: "Bus" },
  { key: "dart", label: "DART" },
  { key: "rail", label: "Rail" },
  { key: "luasRed", label: "Luas Red" },
  { key: "luasGreen", label: "Luas Green" },
];

// Delay severity → colour + word. Semantic, not the brand livery.
function severity(maxDelaySec: number): { color: string; label: string; rank: number } {
  const m = maxDelaySec / 60;
  if (m >= 15) return { color: "#DC2626", label: "Severe", rank: 3 };
  if (m >= 7) return { color: "#D97706", label: "Major", rank: 2 };
  if (m >= 2) return { color: "#CA8A04", label: "Minor", rank: 1 };
  return { color: "#16A34A", label: "Slight", rank: 0 };
}

function fmtDelay(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 1) return "<1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function AlertsPage() {
  const { alerts, loading, error, lastUpdated, start, stop, refreshNow } = useAlertsStore();
  const [mode, setMode] = useState<ModeFilter>("all");
  const [, tick] = useState(0);

  useEffect(() => {
    start();
    return () => stop();
  }, [start, stop]);

  // keep the "updated Xs ago" label live
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(
    () => (mode === "all" ? alerts : alerts.filter((a) => a.routeType === mode)),
    [alerts, mode],
  );

  const totalLate = alerts.reduce((s, a) => s + a.lateTrips, 0);
  const worst = alerts[0]; // already sorted by maxDelay
  const ago = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000)) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-light-border bg-light-surface px-5 pb-3 pt-5 dark:border-dark-border dark:bg-dark-surface">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-light-text dark:text-dark-text">
              Live Delays
            </h1>
            <p className="mt-0.5 text-xs text-light-muted dark:text-dark-muted">
              Real-time running delays across the network · from TFI trip updates
            </p>
          </div>
          <button
            onClick={() => refreshNow()}
            className="rounded-full border border-light-border px-3 py-1.5 text-xs font-medium text-light-text transition-colors hover:bg-black/5 dark:border-dark-border dark:text-dark-text dark:hover:bg-white/5"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Summary tiles */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label="Routes affected" value={loading ? "—" : String(alerts.length)} />
          <Stat label="Trips running late" value={loading ? "—" : String(totalLate)} />
          <Stat
            label="Worst delay"
            value={worst ? fmtDelay(worst.maxDelaySec) : loading ? "—" : "none"}
            accent={worst ? severity(worst.maxDelaySec).color : undefined}
          />
        </div>

        {/* Mode filter */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {MODES.map((m) => {
            const on = mode === m.key;
            const c = m.key === "all" ? undefined : ROUTE_COLORS[m.key as RouteType];
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={clsx(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all",
                  on
                    ? "text-white"
                    : "bg-black/5 text-light-muted hover:bg-black/10 dark:bg-white/5 dark:text-dark-muted dark:hover:bg-white/10",
                )}
                style={on ? { backgroundColor: c ?? "#334155" } : undefined}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && <SkeletonList />}

        {!loading && error && (
          <EmptyState
            icon="⚠️"
            title="Couldn’t load delays"
            body={`The trip-updates feed didn’t respond (${error}). It may be briefly rate-limited — try Refresh in a moment.`}
          />
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            icon="✅"
            title={mode === "all" ? "Everything’s running on time" : "No delays on this mode"}
            body="No trips are currently reporting significant delays. Nice."
          />
        )}

        {!loading && filtered.length > 0 && (
          <ul className="flex flex-col gap-2">
            {filtered.map((a) => (
              <AlertRow key={`${a.routeType}-${a.routeId}-${a.totalTrips}`} alert={a} />
            ))}
          </ul>
        )}

        {ago != null && (
          <p className="mt-6 text-center text-xs text-light-muted dark:text-dark-muted">
            Updated {ago}s ago · refreshes automatically
          </p>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: RouteAlert }) {
  const sev = severity(alert.maxDelaySec);
  const routeColor = ROUTE_COLORS[alert.routeType];
  const pct = alert.totalTrips ? Math.round((alert.lateTrips / alert.totalTrips) * 100) : 0;

  return (
    <li
      className="flex items-center gap-3 rounded-xl border border-light-border bg-light-card p-3 dark:border-dark-border dark:bg-dark-card"
      style={{ borderLeft: `3px solid ${sev.color}` }}
    >
      <span
        className="flex h-11 min-w-[3rem] items-center justify-center rounded-lg px-1.5 text-sm font-bold text-white"
        style={{ backgroundColor: routeColor }}
      >
        {alert.routeId || "—"}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-light-text dark:text-dark-text">
            {ROUTE_LABELS[alert.routeType]} {alert.routeId}
          </span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: sev.color }}
          >
            {sev.label}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-light-muted dark:text-dark-muted">
          {alert.lateTrips} of {alert.totalTrips} trips running late
        </div>
        {/* proportion bar */}
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: sev.color }} />
        </div>
      </div>

      <div className="text-right">
        <div className="text-base font-bold text-light-text dark:text-dark-text">
          {fmtDelay(alert.maxDelaySec)}
        </div>
        <div className="text-[10px] text-light-muted dark:text-dark-muted">max delay</div>
      </div>
    </li>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-light-border bg-light-card px-3 py-2 dark:border-dark-border dark:bg-dark-card">
      <div className="text-lg font-bold" style={{ color: accent ?? "inherit" }}>
        {value}
      </div>
      <div className="text-[10px] leading-tight text-light-muted dark:text-dark-muted">{label}</div>
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="text-4xl">{icon}</div>
      <h2 className="text-base font-semibold text-light-text dark:text-dark-text">{title}</h2>
      <p className="max-w-xs text-sm text-light-muted dark:text-dark-muted">{body}</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="h-[72px] animate-pulse rounded-xl border border-light-border bg-light-card dark:border-dark-border dark:bg-dark-card"
        />
      ))}
    </ul>
  );
}
