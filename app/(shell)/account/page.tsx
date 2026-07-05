"use client";

import { useThemeStore } from "@/stores/useThemeStore";
import { useEffect } from "react";

export default function AccountPage() {
  const { theme, toggle, init } = useThemeStore();
  useEffect(() => init(), [init]);

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-2xl font-bold text-light-text dark:text-dark-text">Account</h1>

      <div className="mb-4 rounded-xl border border-light-border bg-light-card p-4 dark:border-dark-border dark:bg-dark-card">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-light-text dark:text-dark-text">Theme</div>
            <div className="text-sm text-light-muted dark:text-dark-muted">
              {theme === "dark" ? "Dark" : "Light"} mode
            </div>
          </div>
          <button
            onClick={toggle}
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            Switch to {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-light-border bg-light-card p-4 text-sm text-light-muted dark:border-dark-border dark:bg-dark-card dark:text-dark-muted">
        Supabase auth (login/settings) ports from auth_provider.dart + auth_service.dart.
        Add <code className="text-accent">@supabase/supabase-js</code> sign-in here next.
      </div>
    </div>
  );
}
