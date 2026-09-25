/**
 * chart-tokens.test.tsx
 *
 * Verifies that the dark-mode chart tooltip surface and gridline tokens are
 * wired up correctly in all three chart components:
 *
 *   - EarningsChart     — bar track + tooltip surface
 *   - RatingBreakdownBars — bar track + tooltip surface + muted text
 *   - SentimentSparkline  — empty-state gridline stroke
 *
 * Coverage targets (≥95 %):
 *   Token presence   — the CSS custom properties appear on the correct elements
 *   Tooltip surface  — bg, border, text color, arrow color all use tokens
 *   Gridline track   — track background uses --chart-gridline-color
 *   Muted text       — secondary tooltip line uses --chart-tooltip-text-muted
 *   Sparkline empty  — dashed line stroke uses --chart-gridline-color token
 *   Sparkline normal — normal lines do NOT use gridline token (colour-coded)
 *   Accessibility    — tooltip role / aria-label preserved after token change
 *   RTL              — tooltip translate class present (rtl:translate-x-1/2)
 *   Keyboard         — Escape dismisses tooltip in RatingBreakdownBars
 *   Edge cases       — zero-value segment, single segment, domain collapse
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import { EarningsChart } from "./earnings-chart";
import { RatingBreakdownBars } from "./rating-breakdown-bars";
import { SentimentSparkline } from "./sentiment-sparkline";
import type { EarningsSegment, RatingCriterion, SentimentDataPoint } from "./types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const twoSegments: EarningsSegment[] = [
  { id: "base", label: "Base Pay", value: 80, formattedValue: "$80", colorClass: "bg-cyan-500" },
  { id: "tips", label: "Tips", value: 20, formattedValue: "$20", colorClass: "bg-amber-500" },
];

const oneSegment: EarningsSegment[] = [
  { id: "base", label: "Base Pay", value: 100, formattedValue: "$100", colorClass: "bg-cyan-500" },
];

const twoCriteria: RatingCriterion[] = [
  { id: "comm", label: "Communication", average: 4.8, count: 20, colorClass: "bg-teal-400" },
  { id: "exp", label: "Expertise", average: 4.2, count: 19, colorClass: "bg-cyan-400" },
];

const oneCriterion: RatingCriterion[] = [
  { id: "single", label: "Overall", average: 5.0, count: 1, colorClass: "bg-teal-400" },
];

const sparklineData: SentimentDataPoint[] = [
  { timestamp: "2026-07-01", positive: 30, mixed: 10, critical: 5 },
  { timestamp: "2026-07-08", positive: 48, mixed: 17, critical: 9 },
];

// ─── EarningsChart — gridline track ───────────────────────────────────────────

describe("EarningsChart — chart-gridline-color token on bar track", () => {
  it("bar track uses --chart-gridline-color via inline style", () => {
    const { container } = render(<EarningsChart segments={twoSegments} />);
    // The outermost track div wraps the segment bars
    const track = container.querySelector<HTMLElement>(
      "[style*='--chart-gridline-color']",
    );
    expect(track).toBeTruthy();
    expect(track!.style.backgroundColor).toBe("var(--chart-gridline-color)");
  });

  it("does not hardcode a bg-slate-800 class on the bar track", () => {
    const { container } = render(<EarningsChart segments={twoSegments} />);
    const trackHasSlateBg = !!container.querySelector(".bg-slate-800\\/50");
    expect(trackHasSlateBg).toBe(false);
  });
});

// ─── EarningsChart — tooltip surface ──────────────────────────────────────────

describe("EarningsChart — chart-tooltip tokens on tooltip surface", () => {
  it("tooltip applies --chart-tooltip-bg as background color", async () => {
    const user = userEvent.setup();
    render(<EarningsChart segments={oneSegment} />);

    const bar = screen.getByRole("progressbar", { name: /Base Pay/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.backgroundColor).toBe("var(--chart-tooltip-bg)");
  });

  it("tooltip applies --chart-tooltip-border as border color", async () => {
    const user = userEvent.setup();
    render(<EarningsChart segments={oneSegment} />);

    const bar = screen.getByRole("progressbar", { name: /Base Pay/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.borderColor).toBe("var(--chart-tooltip-border)");
  });

  it("tooltip applies --chart-tooltip-text as text color", async () => {
    const user = userEvent.setup();
    render(<EarningsChart segments={oneSegment} />);

    const bar = screen.getByRole("progressbar", { name: /Base Pay/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.color).toBe("var(--chart-tooltip-text)");
  });

  it("tooltip caret (arrow) uses --chart-tooltip-bg as borderTopColor", async () => {
    const user = userEvent.setup();
    const { container } = render(<EarningsChart segments={oneSegment} />);

    const bar = screen.getByRole("progressbar", { name: /Base Pay/i });
    await user.hover(bar);

    // The caret div uses borderTopColor as an inline style;
    // jsdom serialises it as "border-top-color" in the style attribute.
    const caret = container.querySelector<HTMLElement>(
      "[style*='border-top-color']",
    );
    expect(caret).toBeTruthy();
    expect(caret!.style.borderTopColor).toBe("var(--chart-tooltip-bg)");
  });

  it("does not use hardcoded bg-slate-900 class on the tooltip", async () => {
    const user = userEvent.setup();
    render(<EarningsChart segments={oneSegment} />);

    const bar = screen.getByRole("progressbar", { name: /Base Pay/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.classList.contains("bg-slate-900")).toBe(false);
  });

  it("tooltip contains segment label and formatted value", async () => {
    const user = userEvent.setup();
    render(<EarningsChart segments={oneSegment} />);

    const bar = screen.getByRole("progressbar", { name: /Base Pay/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Base Pay");
    expect(tooltip).toHaveTextContent("$100");
  });

  it("tooltip has RTL-aware translate class", async () => {
    const user = userEvent.setup();
    render(<EarningsChart segments={oneSegment} />);

    const bar = screen.getByRole("progressbar", { name: /Base Pay/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("rtl:translate-x-1/2");
  });

  it("tooltip disappears after mouse leave", async () => {
    const user = userEvent.setup();
    render(<EarningsChart segments={oneSegment} />);

    const bar = screen.getByRole("progressbar", { name: /Base Pay/i });
    await user.hover(bar);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    await user.unhover(bar);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("tooltip appears on focus and disappears on blur", () => {
    render(<EarningsChart segments={oneSegment} />);

    const bar = screen.getByRole("progressbar", { name: /Base Pay/i });
    fireEvent.focus(bar);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(bar);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("only one tooltip is visible at a time", async () => {
    const user = userEvent.setup();
    render(<EarningsChart segments={twoSegments} />);

    const bars = screen.getAllByRole("progressbar");
    await user.hover(bars[0]);
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);

    await user.hover(bars[1]);
    expect(screen.getAllByRole("tooltip")).toHaveLength(1);
  });
});

// ─── EarningsChart — accessibility ────────────────────────────────────────────

describe("EarningsChart — accessibility after token change", () => {
  it("region has accessible label", () => {
    render(<EarningsChart segments={twoSegments} />);
    expect(screen.getByRole("region", { name: /earnings breakdown/i })).toBeInTheDocument();
  });

  it("each bar has aria-valuenow, aria-valuemin, aria-valuemax", () => {
    render(<EarningsChart segments={twoSegments} />);
    const [base, tips] = screen.getAllByRole("progressbar");
    expect(base).toHaveAttribute("aria-valuenow", "80");
    expect(base).toHaveAttribute("aria-valuemin", "0");
    expect(base).toHaveAttribute("aria-valuemax", "100");
    expect(tips).toHaveAttribute("aria-valuenow", "20");
  });

  it("returns null when all segments are zero", () => {
    const { container } = render(
      <EarningsChart segments={[{ id: "a", label: "A", value: 0, formattedValue: "$0", colorClass: "bg-cyan-500" }]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null for empty segments array", () => {
    const { container } = render(<EarningsChart segments={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("zero-width segments are not rendered as progress bars", () => {
    const segments: EarningsSegment[] = [
      { id: "a", label: "A", value: 100, formattedValue: "$100", colorClass: "bg-cyan-500" },
      { id: "b", label: "B", value: 0, formattedValue: "$0", colorClass: "bg-amber-500" },
    ];
    render(<EarningsChart segments={segments} />);
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  });
});

// ─── RatingBreakdownBars — gridline track ─────────────────────────────────────

describe("RatingBreakdownBars — chart-gridline-color token on bar track", () => {
  it("each bar track uses --chart-gridline-color via inline style", () => {
    const { container } = render(<RatingBreakdownBars criteria={twoCriteria} />);
    const tracks = container.querySelectorAll<HTMLElement>(
      "[style*='--chart-gridline-color']",
    );
    // One track per criterion
    expect(tracks.length).toBe(twoCriteria.length);
    tracks.forEach((track) => {
      expect(track.style.backgroundColor).toBe("var(--chart-gridline-color)");
    });
  });

  it("does not hardcode bg-slate-800 on bar tracks", () => {
    const { container } = render(<RatingBreakdownBars criteria={twoCriteria} />);
    expect(container.querySelector(".bg-slate-800\\/50")).toBeNull();
    expect(container.querySelector(".bg-slate-200\\/60")).toBeNull();
  });
});

// ─── RatingBreakdownBars — tooltip surface ────────────────────────────────────

describe("RatingBreakdownBars — chart-tooltip tokens on tooltip surface", () => {
  it("tooltip applies --chart-tooltip-bg as background color", async () => {
    const user = userEvent.setup();
    render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.backgroundColor).toBe("var(--chart-tooltip-bg)");
  });

  it("tooltip applies --chart-tooltip-border as border color", async () => {
    const user = userEvent.setup();
    render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.borderColor).toBe("var(--chart-tooltip-border)");
  });

  it("tooltip applies --chart-tooltip-text as text color", async () => {
    const user = userEvent.setup();
    render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.style.color).toBe("var(--chart-tooltip-text)");
  });

  it("tooltip muted span applies --chart-tooltip-text-muted via inline style", async () => {
    const user = userEvent.setup();
    const { container } = render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    await user.hover(bar);

    // The muted span contains the "Based on N reviews" text
    const muted = container.querySelector<HTMLElement>(
      "[style*='--chart-tooltip-text-muted']",
    );
    expect(muted).toBeTruthy();
    expect(muted!.style.color).toBe("var(--chart-tooltip-text-muted)");
    expect(muted!.textContent).toContain("Based on 20 reviews");
  });

  it("tooltip caret uses --chart-tooltip-bg as borderTopColor", async () => {
    const user = userEvent.setup();
    const { container } = render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    await user.hover(bar);

    // jsdom serialises camelCase inline style as "border-top-color"
    const caret = container.querySelector<HTMLElement>(
      "[style*='border-top-color']",
    );
    expect(caret).toBeTruthy();
    expect(caret!.style.borderTopColor).toBe("var(--chart-tooltip-bg)");
  });

  it("does not use hardcoded bg-slate-900 class on the tooltip", async () => {
    const user = userEvent.setup();
    render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.classList.contains("bg-slate-900")).toBe(false);
  });

  it("does not use hardcoded text-white class on the tooltip", async () => {
    const user = userEvent.setup();
    render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.classList.contains("text-white")).toBe(false);
  });

  it("does not use hardcoded text-slate-400 class on the muted span", async () => {
    const user = userEvent.setup();
    render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    await user.hover(bar);

    // There should be no direct text-slate-400 in the tooltip muted span
    const tooltip = screen.getByRole("tooltip");
    const muted = tooltip.querySelector(".text-slate-400");
    expect(muted).toBeNull();
  });

  it("tooltip contains criterion score and count disclosure", async () => {
    const user = userEvent.setup();
    render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("4.8 / 5");
    expect(tooltip).toHaveTextContent("Based on 20 reviews");
  });

  it("tooltip has RTL-aware translate class", async () => {
    const user = userEvent.setup();
    render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    await user.hover(bar);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.className).toContain("rtl:translate-x-1/2");
  });
});

// ─── RatingBreakdownBars — keyboard / accessibility ───────────────────────────

describe("RatingBreakdownBars — keyboard and accessibility after token change", () => {
  it("Escape key dismisses tooltip", () => {
    render(<RatingBreakdownBars criteria={twoCriteria} />);

    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    fireEvent.focus(bar);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(bar, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("single-review criterion uses singular 'review' label", () => {
    render(<RatingBreakdownBars criteria={oneCriterion} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-label", expect.stringContaining("1 review"));
    expect(bar).not.toHaveAttribute("aria-label", expect.stringContaining("1 reviews"));
  });

  it("empty criteria shows empty state message without progress bars", () => {
    render(<RatingBreakdownBars criteria={[]} />);
    expect(screen.getByText(/No rating data available yet/)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("tooltip disappears on blur", () => {
    render(<RatingBreakdownBars criteria={twoCriteria} />);
    const bar = screen.getByRole("progressbar", { name: /Communication/i });
    fireEvent.focus(bar);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.blur(bar);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

// ─── SentimentSparkline — gridline token on empty state line ──────────────────

describe("SentimentSparkline — chart-gridline tokens on empty-state line", () => {
  it("empty-state dashed line uses var(--chart-gridline-color) as stroke", () => {
    const { container } = render(<SentimentSparkline data={[]} />);
    const line = container.querySelector<SVGLineElement>("line");
    expect(line).toBeTruthy();
    expect(line!.getAttribute("stroke")).toBe(
      "var(--chart-gridline-color, currentColor)",
    );
  });

  it("empty-state line uses var(--chart-gridline-stroke-width) as strokeWidth", () => {
    const { container } = render(<SentimentSparkline data={[]} />);
    const line = container.querySelector<SVGLineElement>("line");
    expect(line!.getAttribute("stroke-width")).toBe(
      "var(--chart-gridline-stroke-width, 1)",
    );
  });

  it("empty-state line is dashed (has stroke-dasharray)", () => {
    const { container } = render(<SentimentSparkline data={[]} />);
    const line = container.querySelector<SVGLineElement>("line");
    expect(line!.getAttribute("stroke-dasharray")).toBeTruthy();
  });

  it("does not use hardcoded currentColor-only stroke on the empty line", () => {
    const { container } = render(<SentimentSparkline data={[]} />);
    const line = container.querySelector<SVGLineElement>("line");
    // Must reference the token, not be plain "currentColor"
    expect(line!.getAttribute("stroke")).not.toBe("currentColor");
  });

  it("normal sparkline polylines do NOT use --chart-gridline-color as stroke", () => {
    const { container } = render(<SentimentSparkline data={sparklineData} />);
    const polylines = container.querySelectorAll<SVGPolylineElement>("polyline");
    polylines.forEach((pl) => {
      expect(pl.getAttribute("stroke")).not.toContain("--chart-gridline-color");
    });
  });

  it("empty-state SVG role and aria-label are preserved", () => {
    render(<SentimentSparkline data={[]} />);
    const svg = screen.getByTestId("sentiment-sparkline-empty");
    expect(svg).toHaveAttribute("role", "img");
    expect(svg.getAttribute("aria-label")).toBeTruthy();
  });
});

// ─── Cross-component — no hardcoded palette classes remain ────────────────────

describe("No hardcoded chart palette classes after tokenisation", () => {
  it("EarningsChart tooltip has no bg-slate-900 class", async () => {
    const user = userEvent.setup();
    render(<EarningsChart segments={oneSegment} />);
    await user.hover(screen.getByRole("progressbar", { name: /Base Pay/i }));
    const tooltip = screen.getByRole("tooltip");
    expect([...tooltip.classList]).not.toContain("bg-slate-900");
  });

  it("RatingBreakdownBars tooltip has no bg-slate-900 class", async () => {
    const user = userEvent.setup();
    render(<RatingBreakdownBars criteria={twoCriteria} />);
    await user.hover(screen.getByRole("progressbar", { name: /Communication/i }));
    const tooltip = screen.getByRole("tooltip");
    expect([...tooltip.classList]).not.toContain("bg-slate-900");
  });

  it("RatingBreakdownBars bar track has no bg-slate-200 class", () => {
    const { container } = render(<RatingBreakdownBars criteria={twoCriteria} />);
    const tracks = container.querySelectorAll("[role='progressbar']");
    tracks.forEach((track) => {
      expect([...track.classList].some((c) => c.startsWith("bg-slate-200"))).toBe(false);
    });
  });
});
