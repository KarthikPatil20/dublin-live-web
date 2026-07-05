import { create } from "zustand";

// Ported from lib/providers/theme_provider.dart
type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  init: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",
  toggle: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    apply(next);
    set({ theme: next });
  },
  init: () => {
    const stored =
      typeof window !== "undefined"
        ? (localStorage.getItem("theme") as Theme | null)
        : null;
    const theme: Theme = stored ?? "dark";
    apply(theme);
    set({ theme });
  },
}));

function apply(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}
