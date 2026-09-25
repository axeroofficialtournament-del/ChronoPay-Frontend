"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Density modes for data-dense surfaces (slot list, holdings, history).
 *
 * The preference is stored once under `chronopay-density` and mirrored onto
 * `<html>` as `data-density`, which is what the `--density-*` custom properties
 * in `globals.css` key off. Keeping one key means the slot list, the settings
 * switcher and the pre-paint bootstrap in `layout.tsx` can never disagree.
 */
export type Density = "comfortable" | "balanced" | "compact";

export const DENSITY_STORAGE_KEY = "chronopay-density";

export const DENSITY_OPTIONS: readonly Density[] = [
  "comfortable",
  "balanced",
  "compact",
];

export const DEFAULT_DENSITY: Density = "balanced";

function isDensity(value: unknown): value is Density {
  return (
    value === "comfortable" || value === "balanced" || value === "compact"
  );
}

/** Human-readable label for a density mode. */
export function densityLabel(density: Density): string {
  return density.charAt(0).toUpperCase() + density.slice(1);
}

/** Set the `data-density` attribute on <html>. Safe to call before hydration. */
export function applyDensity(density: Density) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.density = density;
}

/**
 * Read a persisted density preference. Anything unrecognised — including a
 * value written by an older build, or a corrupted entry — falls back to the
 * default rather than leaking an unsupported mode into `data-density`.
 */
export function readPersistedDensity(): Density {
  if (typeof window === "undefined") return DEFAULT_DENSITY;
  try {
    const raw = window.localStorage.getItem(DENSITY_STORAGE_KEY);
    return isDensity(raw) ? raw : DEFAULT_DENSITY;
  } catch {
    // localStorage unavailable (private mode) — stay on the default.
    return DEFAULT_DENSITY;
  }
}

/** Persist a density preference, best-effort. */
function persistDensity(density: Density) {
  try {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
  } catch {
    // Non-fatal: persistence is best-effort.
  }
}

/**
 * Density-mode hook.
 *
 * Returns the active mode plus a setter that both persists the choice and
 * applies it to `<html>` so every surface re-tokenises at once. Motion is
 * never used to signal the change (see `motion-reduce:transition-none` on the
 * surfaces), so users who ask for reduced motion get an instant switch.
 */
export function useDensity() {
  const [density, setDensityState] = useState<Density>(readPersistedDensity);

  // Keep <html> data-density in sync with the current mode.
  useEffect(() => {
    applyDensity(density);
  }, [density]);

  const setDensity = useCallback((next: Density) => {
    setDensityState(next);
    persistDensity(next);
  }, []);

  return {
    density,
    setDensity,
    isCompact: density === "compact",
    isComfortable: density === "comfortable",
  };
}
