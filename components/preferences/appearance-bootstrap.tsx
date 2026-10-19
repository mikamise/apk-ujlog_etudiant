"use client";

import { useEffect } from "react";

const KEY = "ujlog-ui-preferences";

type Preferences = { theme?: "light" | "dark" | "system"; reduceMotion?: boolean };

function applyPreferences(prefs: Preferences) {
  const root = document.documentElement;
  const theme = prefs.theme || "system";
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.reduceMotion = prefs.reduceMotion ? "true" : "false";
}

export function AppearanceBootstrap() {
  useEffect(() => {
    let prefs: Preferences = { theme: "system", reduceMotion: false };
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) prefs = { ...prefs, ...JSON.parse(stored) };
    } catch { /* stockage indisponible : préférences système */ }
    applyPreferences(prefs);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if ((prefs.theme || "system") === "system") applyPreferences(prefs);
    };
    media.addEventListener?.("change", onChange);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      try { prefs = { ...prefs, ...(event.newValue ? JSON.parse(event.newValue) : {}) }; } catch {}
      applyPreferences(prefs);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener?.("change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}
