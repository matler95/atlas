import { useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "forge-theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem(KEY) as Theme) || "dark";
  });

  useEffect(() => {
    apply(theme);
    try { localStorage.setItem(KEY, theme); } catch {}
  }, [theme]);

  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}