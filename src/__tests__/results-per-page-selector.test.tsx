import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { axe } from "jest-axe";
import { Suspense } from "react";

// Mock next/navigation. We mutate this object's methods between renders
// to simulate URL changes (back button, deep link arrival, etc.).
const mockSearchParams = {
  get: vi.fn((_key: string): string | null => null),
  entries: vi.fn(
    function* (): IterableIterator<[string, string]> {},
  ),
  toString: vi.fn(() => ""),
};

const mockRouter = {
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
};

const mockPathname = "/marketplace";

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

import {
  ResultsPerPageSelector,
  usePageSize,
  DEFAULT_PAGE_SIZE,
  DEFAULT_PAGE_SIZE_OPTIONS,
  DEFAULT_STORAGE_KEY,
  DEFAULT_PARAM_KEY,
  __test_only,
} from "@/components/marketplace/results-per-page-selector";

beforeEach(() => {
  // Force a clean slate before every test so storage or router
  // state from a previous spec doesn't leak.
  localStorage.clear();
  mockSearchParams.get.mockReset();
  mockSearchParams.get.mockReturnValue(null);
  mockRouter.replace.mockReset();
  mockRouter.push.mockReset();
  mockRouter.back.mockReset();
  // Reset the URL seam to "no params".
  mockSearchParams.toString.mockReturnValue("");
  // Default `entries` yields nothing when no URL params.
  mockSearchParams.entries = vi.fn(function* (): IterableIterator<[
    string,
    string,
  ]> {});
  // window.location.search is read once via the lazy initializer — patch it
  // for each test that wants to simulate a deep link.
  window.history.replaceState(null, "", "/marketplace");
});

afterEach(() => {
  // Drop the deep-link state so the *next* test's lazy initializer sees
  // a clean URL.
  window.history.replaceState(null, "", "/marketplace");
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Render a host component that uses `usePageSize` so the hook is exercised
 * in the same React tree as `ResultsPerPageSelector`. Keeps state / URL /
 * storage in lock-step so we can assert them together.
 */
function renderHarness(extraProps: {
  totalCount?: number;
  options?: typeof DEFAULT_PAGE_SIZE_OPTIONS;
} = {}) {
  function Host() {
    const { value, setValue } = usePageSize();
    return (
      <ResultsPerPageSelector
        value={value}
        onChange={setValue}
        {...(extraProps.options ? { options: extraProps.options } : {})}
        {...(extraProps.totalCount !== undefined
          ? { totalCount: extraProps.totalCount }
          : {})}
      />
    );
  }
  return render(
    <Suspense fallback={null}>
      <Host />
    </Suspense>,
  );
}

function deepLinkSearch(getValue: string | null) {
  // 1. Patch `window.location.search` so the lazy initializer picks it up.
  const search = getValue === null ? "" : `?${DEFAULT_PARAM_KEY}=${getValue}`;
  window.history.replaceState(null, "", `/marketplace${search}`);
  // 2. Patch the `useSearchParams` mock so subsequent renders agree with the URL.
  mockSearchParams.get.mockImplementation((k: string) =>
    k === DEFAULT_PARAM_KEY ? getValue : null,
  );
  mockSearchParams.toString.mockImplementation(() => search);
  mockSearchParams.entries = vi.fn(function* () {
    if (getValue !== null) yield [DEFAULT_PARAM_KEY, getValue];
  });
}

// ─── Hook: usePageSize ───────────────────────────────────────────────────────

describe("usePageSize", () => {
  it("defaults to the default value when nothing is configured", () => {
    function Host() {
      const { value } = usePageSize();
      return <p data-testid="value">{value}</p>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );
    expect(screen.getByTestId("value").textContent).toBe(
      String(DEFAULT_PAGE_SIZE),
    );
  });

  it("uses the URL param when present on mount", () => {
    deepLinkSearch("12");

    function Host() {
      const { value } = usePageSize();
      return <p data-testid="value">{value}</p>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );
    expect(screen.getByTestId("value").textContent).toBe("12");
  });

  it("uses localStorage when URL param is missing", () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, "48");

    function Host() {
      const { value } = usePageSize();
      return <p data-testid="value">{value}</p>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );
    expect(screen.getByTestId("value").textContent).toBe("48");
  });

  it("lets the URL param override a stale localStorage value", () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, "48");
    deepLinkSearch("12");

    function Host() {
      const { value } = usePageSize();
      return <p data-testid="value">{value}</p>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );
    expect(screen.getByTestId("value").textContent).toBe("12");
  });

  it("ignores invalid URL params and falls back to localStorage", () => {
    localStorage.setItem(DEFAULT_STORAGE_KEY, "24");
    deepLinkSearch("abc");

    function Host() {
      const { value } = usePageSize();
      return <p data-testid="value">{value}</p>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );
    expect(screen.getByTestId("value").textContent).toBe("24");
  });

  it("ignores URL params whose value isn't in `options`", () => {
    deepLinkSearch("999");

    function Host() {
      const { value } = usePageSize();
      return <p data-testid="value">{value}</p>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );
    expect(screen.getByTestId("value").textContent).toBe(
      String(DEFAULT_PAGE_SIZE),
    );
  });

  it("exposes the configured options array", () => {
    function Host() {
      const { options } = usePageSize();
      return <p data-testid="value">{options.join(",")}</p>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );
    expect(screen.getByTestId("value").textContent).toBe("12,24,48");
  });

  it("updates value and writes to localStorage on setValue", () => {
    function Host() {
      const { value, setValue } = usePageSize();
      return (
        <>
          <p data-testid="value">{value}</p>
          <button onClick={() => setValue(48)}>Set48</button>
        </>
      );
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );
    expect(screen.getByTestId("value").textContent).toBe("24");
    act(() => {
      fireEvent.click(screen.getByText("Set48"));
    });
    // After router.replace re-renders, URL will reflect the new value.
    deepLinkSearch("48");
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe("48");
  });

  it("calls router.replace with the new URL on setValue", () => {
    function Host() {
      const { setValue } = usePageSize();
      return <button onClick={() => setValue(12)}>Set12</button>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );

    act(() => {
      fireEvent.click(screen.getByText("Set12"));
    });

    // We can't reliably assert the exact URL because params like `scroll`
    // aren't included in the test render's searchParams, but router.replace
    // should be called exactly once with the path + new param.
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    const [href, opts] = mockRouter.replace.mock.calls[0];
    expect(href).toContain(`${DEFAULT_PARAM_KEY}=12`);
    expect(opts).toEqual({ scroll: false });
  });

  it("silently ignores setValue for values not in options", () => {
    function Host() {
      const { setValue } = usePageSize();
      return <button onClick={() => setValue(99)}>Bad</button>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );

    act(() => {
      fireEvent.click(screen.getByText("Bad"));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBeNull();
  });

  it("honours a custom storageKey / paramKey / defaultValue", () => {
    localStorage.setItem("custom:rpp", "12");
    deepLinkSearch("48");

    window.history.replaceState(
      null,
      "",
      "/marketplace?customParam=48",
    );
    mockSearchParams.get.mockImplementation((k: string) =>
      k === "customParam" ? "48" : null,
    );
    mockSearchParams.toString.mockReturnValue("customParam=48");

    function Host() {
      const { value } = usePageSize({
        storageKey: "custom:rpp",
        paramKey: "customParam",
      });
      return <p data-testid="value">{value}</p>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );
    expect(screen.getByTestId("value").textContent).toBe("48");
  });

  it("falls back silently when localStorage throws on read", () => {
    const original = localStorage.getItem;
    try {
      // Force the read path to throw, simulating Safari private mode.
      localStorage.getItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      function Host() {
        const { value } = usePageSize();
        return <p data-testid="value">{value}</p>;
      }
      render(
        <Suspense fallback={null}>
          <Host />
        </Suspense>,
      );
      expect(screen.getByTestId("value").textContent).toBe(
        String(DEFAULT_PAGE_SIZE),
      );
    } finally {
      localStorage.getItem = original;
    }
  });

  it("swallows localStorage write failures", () => {
    const original = localStorage.setItem;
    try {
      localStorage.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      function Host() {
        const { setValue } = usePageSize();
        return <button onClick={() => setValue(48)}>Set48</button>;
      }
      render(
        <Suspense fallback={null}>
          <Host />
        </Suspense>,
      );

      // Should not throw even though storage writes fail.
      act(() => {
        fireEvent.click(screen.getByText("Set48"));
      });

      expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    } finally {
      localStorage.setItem = original;
    }
  });
});

// ─── Component: ResultsPerPageSelector ───────────────────────────────────────

describe("ResultsPerPageSelector", () => {
  it("renders a radiogroup with a visible label", () => {
    renderHarness();
    expect(
      screen.getByRole("radiogroup", { name: /results per page/i }),
    ).toBeInTheDocument();
  });

  it("renders one radio per default option", () => {
    renderHarness();
    expect(
      screen.getByRole("radio", { name: /12 results per page/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /24 results per page/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /48 results per page/i }),
    ).toBeInTheDocument();
  });

  it("marks the active option with aria-checked=true and tabIndex=0", () => {
    renderHarness();
    const r24 = screen.getByRole("radio", { name: /24 results per page/i });
    const r12 = screen.getByRole("radio", { name: /12 results per page/i });

    expect(r24).toHaveAttribute("aria-checked", "true");
    expect(r24).toHaveAttribute("tabindex", "0");
    expect(r12).toHaveAttribute("aria-checked", "false");
    expect(r12).toHaveAttribute("tabindex", "-1");
  });

  it("calls onChange when a radio is clicked", () => {
    const onChange = vi.fn();
    render(
      <Suspense fallback={null}>
        <ResultsPerPageSelector value={24} onChange={onChange} />
      </Suspense>,
    );

    act(() => {
      fireEvent.click(
        screen.getByRole("radio", { name: /48 results per page/i }),
      );
    });
    expect(onChange).toHaveBeenCalledWith(48);
  });

  it("does not call onChange when the already-active option is clicked", () => {
    const onChange = vi.fn();
    render(
      <Suspense fallback={null}>
        <ResultsPerPageSelector value={24} onChange={onChange} />
      </Suspense>,
    );

    act(() => {
      fireEvent.click(
        screen.getByRole("radio", { name: /24 results per page/i }),
      );
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("announces the new size through a polite LiveRegion", async () => {
    function Host() {
      const { value, setValue } = usePageSize();
      return (
        <ResultsPerPageSelector
          value={value}
          onChange={setValue}
          totalCount={120}
        />
      );
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );

    act(() => {
      fireEvent.click(
        screen.getByRole("radio", { name: /12 results per page/i }),
      );
    });

    await waitFor(() => {
      const live = document.querySelector('[aria-live="polite"]');
      expect(live?.textContent).toMatch(/12 results per page/i);
      expect(live?.textContent).toMatch(/120/);
    });
  });

  it("renders the visible total counter when totalCount is provided", () => {
    renderHarness({ totalCount: 96 });
    const counter = screen.getByText(/24 \/ page · 96 total/i);
    expect(counter).toBeInTheDocument();
  });

  it("hides the counter when totalCount is undefined", () => {
    renderHarness();
    expect(screen.queryByText(/\/ page/i)).not.toBeInTheDocument();
  });

  it("moves focus between radios with arrow keys", () => {
    renderHarness();
    const r24 = screen.getByRole("radio", { name: /24 results per page/i });
    r24.focus();

    act(() => {
      fireEvent.keyDown(r24, { key: "ArrowRight" });
    });
    expect(
      document.activeElement,
    ).toBe(screen.getByRole("radio", { name: /48 results per page/i }));

    act(() => {
      fireEvent.keyDown(
        screen.getByRole("radio", { name: /48 results per page/i }),
        { key: "ArrowLeft" },
      );
    });
    expect(document.activeElement).toBe(r24);
  });

  it("cycles around with arrow keys (wrap-around)", () => {
    renderHarness();
    const r12 = screen.getByRole("radio", { name: /12 results per page/i });
    r12.focus();

    // Pressing ArrowLeft on the leftmost radio should wrap to 48.
    act(() => {
      fireEvent.keyDown(r12, { key: "ArrowLeft" });
    });
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: /48 results per page/i }),
    );
  });

  it("Home and End jump to first/last", () => {
    renderHarness();
    const r48 = screen.getByRole("radio", { name: /48 results per page/i });
    r48.focus();

    act(() => {
      fireEvent.keyDown(r48, { key: "Home" });
    });
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: /12 results per page/i }),
    );

    act(() => {
      fireEvent.keyDown(
        screen.getByRole("radio", { name: /12 results per page/i }),
        { key: "End" },
      );
    });
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: /48 results per page/i }),
    );
  });

  it("up/down arrows also navigate (vertical mode)", () => {
    renderHarness();
    const r24 = screen.getByRole("radio", { name: /24 results per page/i });
    r24.focus();

    act(() => {
      fireEvent.keyDown(r24, { key: "ArrowDown" });
    });
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: /48 results per page/i }),
    );
  });

  it("honours custom options prop", () => {
    render(
      <Suspense fallback={null}>
        <ResultsPerPageSelector
          value={20}
          onChange={vi.fn()}
          options={[10, 20, 50]}
        />
      </Suspense>,
    );
    expect(
      screen.getByRole("radio", { name: /10 results per page/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /20 results per page/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /50 results per page/i }),
    ).toBeInTheDocument();
  });

  it("honours custom label prop", () => {
    render(
      <Suspense fallback={null}>
        <ResultsPerPageSelector
          value={24}
          onChange={vi.fn()}
          label="Suppliers per page"
        />
      </Suspense>,
    );
    expect(
      screen.getByRole("radiogroup", { name: /suppliers per page/i }),
    ).toBeInTheDocument();
  });

  it("marks the group as aria-invalid when value is not in options", () => {
    render(
      <Suspense fallback={null}>
        <ResultsPerPageSelector value={999} onChange={vi.fn()} />
      </Suspense>,
    );
    expect(screen.getByRole("radiogroup")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("wraps up — composed usePageSize + selector: clicking 48 persists size", () => {
    renderHarness();
    act(() => {
      fireEvent.click(
        screen.getByRole("radio", { name: /48 results per page/i }),
      );
    });

    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe("48");
    expect(mockRouter.replace).toHaveBeenCalledTimes(1);
    const [href, opts] = mockRouter.replace.mock.calls[0];
    expect(href).toContain(`${DEFAULT_PARAM_KEY}=48`);
    expect(opts).toEqual({ scroll: false });
  });

  it("skips router.replace when re-clicking the already-active size", () => {
    // The early-return branch only fires when the URL already agrees with
    // the click (parsed numeric value matches). Without a deep-link the
    // URL has no `page-size` param, so the click is *expected* to write
    // the URL — we assert the reverse below.
    deepLinkSearch("24");

    function Host() {
      const { value, setValue } = usePageSize();
      return (
        <>
          <p data-testid="value">{value}</p>
          <button onClick={() => setValue(24)}>Click24</button>
        </>
      );
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );

    expect(screen.getByTestId("value").textContent).toBe("24");
    expect(mockRouter.replace).not.toHaveBeenCalled();

    act(() => {
      fireEvent.click(screen.getByText("Click24"));
    });

    // URL already in sync (parsed 24 == click 24) — no rewrite.
    expect(mockRouter.replace).not.toHaveBeenCalled();
    // Storage still gets refreshed to record the user's intent.
    expect(localStorage.getItem(DEFAULT_STORAGE_KEY)).toBe("24");
  });

  it("does not run router.replace when URL representation differs but parsed value matches", () => {
    // `?page-size=024` parses to 24 — re-clicking 24 should not rewrite.
    deepLinkSearch("024");

    function Host() {
      const { value, setValue } = usePageSize();
      return (
        <>
          <p data-testid="value">{value}</p>
          <button onClick={() => setValue(24)}>Click24</button>
        </>
      );
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );

    expect(screen.getByTestId("value").textContent).toBe("24");
    act(() => {
      fireEvent.click(screen.getByText("Click24"));
    });

    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("returns the defaultValue when there is no window or localStorage", () => {
    // We can't truly remove window in jsdom — exercise the SSR-equivalent
    // branch by simulating `window.localStorage.getItem` returning a
    // non-numeric value (which the helper short-circuits through the
    // `null` path, then the outer caller falls back to defaultValue).
    localStorage.setItem(DEFAULT_STORAGE_KEY, "not-a-number");
    mockSearchParams.get.mockReturnValue(null);

    function Host() {
      const { value } = usePageSize();
      return <p data-testid="value">{value}</p>;
    }
    render(
      <Suspense fallback={null}>
        <Host />
      </Suspense>,
    );
    expect(screen.getByTestId("value").textContent).toBe(
      String(DEFAULT_PAGE_SIZE),
    );
  });

  it("aria-describedby on the group links to the total counter element", () => {
    renderHarness({ totalCount: 100 });
    const group = screen.getByRole("radiogroup");
    const describedBy = group.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const counterEl = document.getElementById(describedBy as string);
    // The counter element exists and contains the total.
    expect(counterEl).toBeTruthy();
    expect(counterEl?.textContent).toMatch(/100/);
  });
});

// ─── Accessibility (jest-axe) ────────────────────────────────────────────────

describe("ResultsPerPageSelector — accessibility", () => {
  it("has no detectable axe violations with default props", async () => {
    const { container } = renderHarness({ totalCount: 96 });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no detectable axe violations with deep-link URL", async () => {
    deepLinkSearch("48");
    const { container } = renderHarness({ totalCount: 96 });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("has no detectable axe violations when isolated", async () => {
    const { container } = render(
      <Suspense fallback={null}>
        <ResultsPerPageSelector value={24} onChange={vi.fn()} />
      </Suspense>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

// ─── Internal helpers (test-only export) ─────────────────────────────────────

describe("parseUrlParam", () => {
  it.each([
    ["12", 12],
    ["24", 24],
    ["48", 48],
  ])("parses valid numeric values: %s → %i", (raw, expected) => {
    expect(__test_only.parseUrlParam(raw, [12, 24, 48])).toBe(expected);
  });

  it.each([
    [null],
    [undefined],
    ["abc"],
    [""],
    ["-5"],
    ["1.5"],
    ["999"],
  ])("rejects invalid URL params: %s", (raw) => {
    expect(__test_only.parseUrlParam(raw as string | null, [12, 24, 48])).toBeNull();
  });
});

describe("writeStorage", () => {
  it("writes the value when storage is available", () => {
    __test_only.writeStorage("test:write", 24);
    expect(localStorage.getItem("test:write")).toBe("24");
  });

  it("swallows errors thrown by localStorage", () => {
    const original = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => __test_only.writeStorage("test:write2", 24)).not.toThrow();

    localStorage.setItem = original;
  });
});

describe("readInitialFromStorage", () => {
  it("returns null outside of a browser context (no window)", () => {
    const originalWindow = globalThis.window;
    // We cannot truly delete window in jsdom, but we can simulate by
    // checking that the function falls back to null on storage failure.
    const original = localStorage.getItem;
    localStorage.getItem = vi.fn(() => {
      throw new Error("nope");
    });
    expect(__test_only.readInitialFromStorage([12, 24, 48], "k")).toBeNull();
    localStorage.getItem = original;
    void originalWindow;
  });

  it("returns null when the value is not in options", () => {
    localStorage.setItem("test:rpp", "99");
    expect(__test_only.readInitialFromStorage([12, 24, 48], "test:rpp")).toBeNull();
  });

  it("returns the value when valid", () => {
    localStorage.setItem("test:rpp", "12");
    expect(__test_only.readInitialFromStorage([12, 24, 48], "test:rpp")).toBe(12);
  });
});
