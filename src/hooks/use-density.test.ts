import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  DENSITY_STORAGE_KEY,
  DENSITY_OPTIONS,
  DEFAULT_DENSITY,
  applyDensity,
  densityLabel,
  readPersistedDensity,
  useDensity,
} from "./use-density";

describe("density vocabulary", () => {
  it("exposes the three supported modes with balanced as the default", () => {
    expect(DENSITY_OPTIONS).toEqual(["comfortable", "balanced", "compact"]);
    expect(DEFAULT_DENSITY).toBe("balanced");
    expect(DENSITY_OPTIONS).toContain(DEFAULT_DENSITY);
  });

  it("labels each mode for assistive technology", () => {
    expect(densityLabel("comfortable")).toBe("Comfortable");
    expect(densityLabel("balanced")).toBe("Balanced");
    expect(densityLabel("compact")).toBe("Compact");
  });

  it("namespaces the storage key shared with the pre-paint bootstrap", () => {
    expect(DENSITY_STORAGE_KEY).toBe("chronopay-density");
  });
});

describe("applyDensity", () => {
  it("mirrors the mode onto <html> as data-density", () => {
    applyDensity("compact");
    expect(document.documentElement.dataset.density).toBe("compact");
  });

  it("keeps applying so the last write wins", () => {
    applyDensity("comfortable");
    applyDensity("balanced");
    expect(document.documentElement.dataset.density).toBe("balanced");
  });
});

describe("readPersistedDensity", () => {
  it("falls back to the default when nothing is stored", () => {
    expect(readPersistedDensity()).toBe("balanced");
  });

  it("honours each supported mode", () => {
    for (const density of DENSITY_OPTIONS) {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, density);
      expect(readPersistedDensity()).toBe(density);
    }
  });

  it("rejects an unsupported value rather than leaking it into data-density", () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "ultra-dense");
    expect(readPersistedDensity()).toBe("balanced");
  });

  it("survives storage being unavailable", () => {
    const spy = vi
      .spyOn(window.localStorage, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(readPersistedDensity()).toBe("balanced");
    spy.mockRestore();
  });
});

describe("useDensity", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.density;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts from the persisted preference and applies it to <html>", () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "compact");

    const { result } = renderHook(() => useDensity());

    expect(result.current.density).toBe("compact");
    expect(document.documentElement.dataset.density).toBe("compact");
  });

  it("persists a change and re-tokenises the document", () => {
    const { result } = renderHook(() => useDensity());

    act(() => result.current.setDensity("comfortable"));

    expect(result.current.density).toBe("comfortable");
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe(
      "comfortable",
    );
    expect(document.documentElement.dataset.density).toBe("comfortable");
  });

  it("exposes convenience flags for the two extremes", () => {
    const { result } = renderHook(() => useDensity());

    expect(result.current.isCompact).toBe(false);
    expect(result.current.isComfortable).toBe(false);

    act(() => result.current.setDensity("compact"));
    expect(result.current.isCompact).toBe(true);

    act(() => result.current.setDensity("comfortable"));
    expect(result.current.isComfortable).toBe(true);
  });

  it("still switches when persistence is blocked", () => {
    const spy = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });
    const { result } = renderHook(() => useDensity());

    act(() => result.current.setDensity("compact"));

    expect(result.current.density).toBe("compact");
    expect(document.documentElement.dataset.density).toBe("compact");
    spy.mockRestore();
  });
});
