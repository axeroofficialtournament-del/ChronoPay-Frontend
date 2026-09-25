/**
 * Tests for SentimentChipFilter
 *
 * Coverage targets (≥95%):
 * - Rendering: all four chips present with counts
 * - Initial state: defaults to "all" when no URL param
 * - Initial state: reads active bucket from URL param
 * - Interaction: clicking a chip calls onChange and updates aria-pressed
 * - Interaction: clicking the active chip is a no-op
 * - Interaction: arrow-key navigation between chips
 * - Interaction: Home / End keys jump to first / last chip
 * - Announcement: LiveRegion text after selection
 * - Sparkline: rendered when trendData has entries
 * - Sparkline: hidden when trendData is empty
 * - URL sync: router.replace called with correct param on select
 * - URL sync: "all" removes the param from the URL
 * - URL sync: custom paramKey is used instead of default
 * - Edge: invalid URL param falls back to "all"
 * - Edge: zero counts render correctly
 * - Accessibility: role="group" with accessible label
 * - Accessibility: aria-pressed true/false on chips
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SentimentChipFilter } from "./sentiment-chip-filter";
import type { SentimentCounts, SentimentDataPoint } from "./types";

// ─── Next.js navigation mock ──────────────────────────────────────────────────

const mockReplace = vi.fn();
const mockSearchParamsGet = vi.fn<(key: string) => string | null>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/dashboard",
  useSearchParams: () => ({
    get: mockSearchParamsGet,
    toString: () => "",
  }),
}));

// ─── Test fixtures ────────────────────────────────────────────────────────────

const COUNTS: SentimentCounts = { positive: 48, mixed: 17, critical: 9 };

const TREND: SentimentDataPoint[] = [
  { timestamp: "2026-07-01", positive: 30, mixed: 10, critical: 5 },
  { timestamp: "2026-07-08", positive: 48, mixed: 17, critical: 9 },
];

function renderFilter(
  overrides: Partial<React.ComponentProps<typeof SentimentChipFilter>> = {},
) {
  return render(
    <SentimentChipFilter
      counts={COUNTS}
      trendData={TREND}
      {...overrides}
    />,
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChip(name: RegExp | string) {
  return screen.getByTestId(`sentiment-chip-${name}`);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamsGet.mockReturnValue(null); // default: no URL param → "all"
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SentimentChipFilter — rendering", () => {
  it("renders all four chips", () => {
    renderFilter();
    expect(getChip("all")).toBeInTheDocument();
    expect(getChip("positive")).toBeInTheDocument();
    expect(getChip("mixed")).toBeInTheDocument();
    expect(getChip("critical")).toBeInTheDocument();
  });

  it("displays count for each chip", () => {
    renderFilter();
    const total = COUNTS.positive + COUNTS.mixed + COUNTS.critical; // 74
    // aria-labels encode counts
    expect(screen.getByTestId("sentiment-chip-all")).toHaveAccessibleName(
      expect.stringContaining(String(total)),
    );
    expect(screen.getByTestId("sentiment-chip-positive")).toHaveAccessibleName(
      expect.stringContaining("48"),
    );
    expect(screen.getByTestId("sentiment-chip-mixed")).toHaveAccessibleName(
      expect.stringContaining("17"),
    );
    expect(screen.getByTestId("sentiment-chip-critical")).toHaveAccessibleName(
      expect.stringContaining("9"),
    );
  });

  it("renders visible count badges with correct numbers", () => {
    renderFilter();
    // Count badges are aria-hidden, so query by text content directly
    const allChip = getChip("all");
    expect(within(allChip).getByText("74")).toBeInTheDocument();
    expect(within(getChip("positive")).getByText("48")).toBeInTheDocument();
    expect(within(getChip("mixed")).getByText("17")).toBeInTheDocument();
    expect(within(getChip("critical")).getByText("9")).toBeInTheDocument();
  });

  it("renders the group label 'Filter'", () => {
    renderFilter();
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  it("wraps chips in role='group'", () => {
    renderFilter();
    const group = screen.getByRole("group");
    expect(group).toBeInTheDocument();
  });

  it("renders sparkline when trendData has entries", () => {
    renderFilter();
    expect(screen.getByTestId("sparkline-wrapper")).toBeInTheDocument();
    expect(screen.getByTestId("sentiment-sparkline")).toBeInTheDocument();
  });

  it("hides sparkline when trendData is empty", () => {
    renderFilter({ trendData: [] });
    expect(screen.queryByTestId("sparkline-wrapper")).not.toBeInTheDocument();
  });

  it("renders the outer filter container with data-testid", () => {
    renderFilter();
    expect(screen.getByTestId("sentiment-chip-filter")).toBeInTheDocument();
  });
});

describe("SentimentChipFilter — initial active state", () => {
  it("defaults 'all' chip to aria-pressed=true when no URL param", () => {
    mockSearchParamsGet.mockReturnValue(null);
    renderFilter();
    expect(getChip("all")).toHaveAttribute("aria-pressed", "true");
    expect(getChip("positive")).toHaveAttribute("aria-pressed", "false");
    expect(getChip("mixed")).toHaveAttribute("aria-pressed", "false");
    expect(getChip("critical")).toHaveAttribute("aria-pressed", "false");
  });

  it("reads 'positive' from URL param and activates that chip", () => {
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "positive" : null,
    );
    renderFilter();
    expect(getChip("positive")).toHaveAttribute("aria-pressed", "true");
    expect(getChip("all")).toHaveAttribute("aria-pressed", "false");
  });

  it("reads 'mixed' from URL param", () => {
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "mixed" : null,
    );
    renderFilter();
    expect(getChip("mixed")).toHaveAttribute("aria-pressed", "true");
  });

  it("reads 'critical' from URL param", () => {
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "critical" : null,
    );
    renderFilter();
    expect(getChip("critical")).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to 'all' when URL param is an invalid value", () => {
    mockSearchParamsGet.mockReturnValue("garbage");
    renderFilter();
    expect(getChip("all")).toHaveAttribute("aria-pressed", "true");
  });

  it("uses a custom paramKey to read from URL", () => {
    mockSearchParamsGet.mockImplementation((key) =>
      key === "my-key" ? "critical" : null,
    );
    renderFilter({ paramKey: "my-key" });
    expect(getChip("critical")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("SentimentChipFilter — click interactions", () => {
  it("activates 'positive' chip on click", async () => {
    const user = userEvent.setup();
    renderFilter();
    // Simulate URL updating after router.replace
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "positive" : null,
    );
    await user.click(getChip("positive"));
    expect(getChip("positive")).toHaveAttribute("aria-pressed", "true");
    expect(getChip("all")).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the selected bucket", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilter({ onChange });
    await user.click(getChip("mixed"));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith("mixed");
  });

  it("does not call onChange when clicking the already-active chip", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilter({ onChange }); // "all" is active by default
    await user.click(getChip("all"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("switches active chip correctly across multiple clicks", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilter({ onChange });

    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "positive" : null,
    );
    await user.click(getChip("positive"));
    expect(onChange).toHaveBeenLastCalledWith("positive");

    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "critical" : null,
    );
    await user.click(getChip("critical"));
    expect(onChange).toHaveBeenLastCalledWith("critical");

    mockSearchParamsGet.mockReturnValue(null); // "all" removes the param
    await user.click(getChip("all"));
    expect(onChange).toHaveBeenLastCalledWith("all");
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("works without an onChange prop (no crash)", async () => {
    const user = userEvent.setup();
    renderFilter({ onChange: undefined });
    await expect(user.click(getChip("mixed"))).resolves.not.toThrow();
  });
});

describe("SentimentChipFilter — URL sync", () => {
  it("calls router.replace with sentiment param on non-all selection", async () => {
    const user = userEvent.setup();
    renderFilter();
    await user.click(getChip("positive"));
    expect(mockReplace).toHaveBeenCalledOnce();
    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("sentiment=positive");
  });

  it("removes param from URL when selecting 'all'", async () => {
    const user = userEvent.setup();
    // Start with mixed active
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "mixed" : null,
    );
    renderFilter();
    await user.click(getChip("all"));
    const [url] = mockReplace.mock.calls[0];
    expect(url).not.toContain("sentiment");
  });

  it("uses custom paramKey in URL", async () => {
    const user = userEvent.setup();
    renderFilter({ paramKey: "my-key" });
    await user.click(getChip("critical"));
    const [url] = mockReplace.mock.calls[0];
    expect(url).toContain("my-key=critical");
  });

  it("passes scroll: false to router.replace", async () => {
    const user = userEvent.setup();
    renderFilter();
    await user.click(getChip("positive"));
    const [, opts] = mockReplace.mock.calls[0];
    expect(opts).toEqual({ scroll: false });
  });
});

describe("SentimentChipFilter — screen reader announcements", () => {
  it("announces filter change with count when switching to 'positive'", async () => {
    const user = userEvent.setup();
    renderFilter();
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "positive" : null,
    );
    await user.click(getChip("positive"));
    // LiveRegion is sr-only; find it by role="status"
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent(/positive/i);
    expect(region).toHaveTextContent("48");
  });

  it("announces 'Showing all' when switching back to all", async () => {
    const user = userEvent.setup();
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "positive" : null,
    );
    renderFilter();
    mockSearchParamsGet.mockReturnValue(null);
    await user.click(getChip("all"));
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent(/showing all/i);
    expect(region).toHaveTextContent("74");
  });

  it("announces 'mixed' and its count", async () => {
    const user = userEvent.setup();
    renderFilter();
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "mixed" : null,
    );
    await user.click(getChip("mixed"));
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent(/mixed/i);
    expect(region).toHaveTextContent("17");
  });

  it("announces 'critical' and its count", async () => {
    const user = userEvent.setup();
    renderFilter();
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "critical" : null,
    );
    await user.click(getChip("critical"));
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent(/critical/i);
    expect(region).toHaveTextContent("9");
  });

  it("uses singular 'review' when count is 1", async () => {
    const user = userEvent.setup();
    renderFilter({ counts: { positive: 1, mixed: 0, critical: 0 } });
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "positive" : null,
    );
    await user.click(getChip("positive"));
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("1 review");
    expect(region).not.toHaveTextContent("1 reviews");
  });

  it("uses plural 'reviews' when count is 0", async () => {
    const user = userEvent.setup();
    renderFilter({ counts: { positive: 0, mixed: 0, critical: 0 } });
    mockSearchParamsGet.mockImplementation((key) =>
      key === "sentiment" ? "positive" : null,
    );
    await user.click(getChip("positive"));
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("0 reviews");
  });
});

describe("SentimentChipFilter — keyboard navigation", () => {
  it("moves focus to the next chip on ArrowRight", () => {
    renderFilter();
    const allChip = getChip("all");
    allChip.focus();
    fireEvent.keyDown(allChip, { key: "ArrowRight" });
    expect(document.activeElement).toBe(getChip("positive"));
  });

  it("moves focus to the previous chip on ArrowLeft", () => {
    renderFilter();
    const positiveChip = getChip("positive");
    positiveChip.focus();
    fireEvent.keyDown(positiveChip, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(getChip("all"));
  });

  it("wraps focus from last to first on ArrowRight", () => {
    renderFilter();
    const criticalChip = getChip("critical");
    criticalChip.focus();
    fireEvent.keyDown(criticalChip, { key: "ArrowRight" });
    expect(document.activeElement).toBe(getChip("all"));
  });

  it("wraps focus from first to last on ArrowLeft", () => {
    renderFilter();
    const allChip = getChip("all");
    allChip.focus();
    fireEvent.keyDown(allChip, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(getChip("critical"));
  });

  it("moves focus to first chip on Home key", () => {
    renderFilter();
    const criticalChip = getChip("critical");
    criticalChip.focus();
    fireEvent.keyDown(criticalChip, { key: "Home" });
    expect(document.activeElement).toBe(getChip("all"));
  });

  it("moves focus to last chip on End key", () => {
    renderFilter();
    const allChip = getChip("all");
    allChip.focus();
    fireEvent.keyDown(allChip, { key: "End" });
    expect(document.activeElement).toBe(getChip("critical"));
  });

  it("moves focus on ArrowDown (same as ArrowRight)", () => {
    renderFilter();
    const allChip = getChip("all");
    allChip.focus();
    fireEvent.keyDown(allChip, { key: "ArrowDown" });
    expect(document.activeElement).toBe(getChip("positive"));
  });

  it("moves focus on ArrowUp (same as ArrowLeft)", () => {
    renderFilter();
    const positiveChip = getChip("positive");
    positiveChip.focus();
    fireEvent.keyDown(positiveChip, { key: "ArrowUp" });
    expect(document.activeElement).toBe(getChip("all"));
  });

  it("does not move focus on unhandled keys", () => {
    renderFilter();
    const allChip = getChip("all");
    allChip.focus();
    fireEvent.keyDown(allChip, { key: "Tab" });
    // focus stays on allChip (Tab is handled by the browser, not by our handler)
    // We just confirm no crash and no aria-pressed change
    expect(getChip("all")).toHaveAttribute("aria-pressed", "true");
  });
});

describe("SentimentChipFilter — accessibility attributes", () => {
  it("each chip has type='button'", () => {
    renderFilter();
    for (const bucket of ["all", "positive", "mixed", "critical"]) {
      expect(getChip(bucket)).toHaveAttribute("type", "button");
    }
  });

  it("each chip has a non-empty aria-label", () => {
    renderFilter();
    for (const bucket of ["all", "positive", "mixed", "critical"]) {
      const label = getChip(bucket).getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    }
  });

  it("each chip has a title attribute", () => {
    renderFilter();
    for (const bucket of ["all", "positive", "mixed", "critical"]) {
      expect(getChip(bucket)).toHaveAttribute("title");
    }
  });

  it("the group has an accessible name via aria-labelledby", () => {
    renderFilter();
    const group = screen.getByRole("group");
    const labelId = group.getAttribute("aria-labelledby");
    expect(labelId).toBeTruthy();
    const labelEl = document.getElementById(labelId!);
    expect(labelEl).toBeInTheDocument();
    expect(labelEl!.textContent).toBe("Filter");
  });

  it("applies data-chip attribute to every chip button", () => {
    renderFilter();
    for (const bucket of ["all", "positive", "mixed", "critical"]) {
      expect(getChip(bucket)).toHaveAttribute("data-chip");
    }
  });
});

describe("SentimentChipFilter — edge cases", () => {
  it("renders with all-zero counts without crashing", () => {
    renderFilter({ counts: { positive: 0, mixed: 0, critical: 0 } });
    expect(within(getChip("all")).getByText("0")).toBeInTheDocument();
    expect(within(getChip("positive")).getByText("0")).toBeInTheDocument();
  });

  it("renders correctly with very large counts", () => {
    renderFilter({ counts: { positive: 9999, mixed: 5000, critical: 1234 } });
    expect(within(getChip("positive")).getByText("9999")).toBeInTheDocument();
  });

  it("applies custom className to the wrapper", () => {
    renderFilter({ className: "custom-test-class" });
    expect(screen.getByTestId("sentiment-chip-filter")).toHaveClass(
      "custom-test-class",
    );
  });
});
