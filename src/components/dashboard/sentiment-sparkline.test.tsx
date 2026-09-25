/**
 * Tests for SentimentSparkline
 *
 * Coverage targets (≥95%):
 * - Empty data: renders fallback dashed line + correct testid
 * - Normal data: SVG present with correct dimensions and role
 * - Normal data: polylines rendered for each requested series
 * - Normal data: terminal dots rendered for each series
 * - Accessibility: role="img", non-empty aria-label, <title> element
 * - Series filtering: only requested series are rendered
 * - Single data point: renders without crashing (no division by zero)
 * - All-same values: renders without crashing (domain collapse)
 * - Custom dimensions passed to SVG
 * - Custom label overrides auto-generated aria-label
 * - className forwarded to SVG element
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SentimentSparkline } from "./sentiment-sparkline";
import type { SentimentDataPoint } from "./types";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TWO_POINTS: SentimentDataPoint[] = [
  { timestamp: "2026-07-01", positive: 30, mixed: 10, critical: 5 },
  { timestamp: "2026-07-08", positive: 48, mixed: 17, critical: 9 },
];

const EIGHT_POINTS: SentimentDataPoint[] = [
  { timestamp: "2026-06-01", positive: 22, mixed: 11, critical: 7 },
  { timestamp: "2026-06-08", positive: 28, mixed: 13, critical: 8 },
  { timestamp: "2026-06-15", positive: 31, mixed: 15, critical: 9 },
  { timestamp: "2026-06-22", positive: 35, mixed: 14, critical: 10 },
  { timestamp: "2026-06-29", positive: 38, mixed: 16, critical: 9 },
  { timestamp: "2026-07-06", positive: 41, mixed: 15, critical: 8 },
  { timestamp: "2026-07-13", positive: 45, mixed: 17, critical: 9 },
  { timestamp: "2026-07-20", positive: 48, mixed: 17, critical: 9 },
];

const SINGLE_POINT: SentimentDataPoint[] = [
  { timestamp: "2026-07-20", positive: 48, mixed: 17, critical: 9 },
];

const ALL_SAME: SentimentDataPoint[] = [
  { timestamp: "2026-07-01", positive: 10, mixed: 10, critical: 10 },
  { timestamp: "2026-07-08", positive: 10, mixed: 10, critical: 10 },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SentimentSparkline — empty state", () => {
  it("renders the empty testid when data is empty", () => {
    render(<SentimentSparkline data={[]} />);
    expect(screen.getByTestId("sentiment-sparkline-empty")).toBeInTheDocument();
  });

  it("does not render the normal sparkline when data is empty", () => {
    render(<SentimentSparkline data={[]} />);
    expect(screen.queryByTestId("sentiment-sparkline")).not.toBeInTheDocument();
  });

  it("empty SVG has role='img'", () => {
    render(<SentimentSparkline data={[]} />);
    const svg = screen.getByTestId("sentiment-sparkline-empty");
    expect(svg).toHaveAttribute("role", "img");
  });

  it("empty SVG has an aria-label", () => {
    render(<SentimentSparkline data={[]} />);
    const svg = screen.getByTestId("sentiment-sparkline-empty");
    expect(svg.getAttribute("aria-label")).toBeTruthy();
  });

  it("renders the fallback dashed horizontal line when empty", () => {
    const { container } = render(<SentimentSparkline data={[]} />);
    const line = container.querySelector("line");
    expect(line).toBeInTheDocument();
  });

  it("respects custom dimensions on the empty SVG", () => {
    render(<SentimentSparkline data={[]} width={120} height={40} />);
    const svg = screen.getByTestId("sentiment-sparkline-empty");
    expect(svg).toHaveAttribute("width", "120");
    expect(svg).toHaveAttribute("height", "40");
  });
});

describe("SentimentSparkline — normal rendering", () => {
  it("renders the sparkline testid with data", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    expect(screen.getByTestId("sentiment-sparkline")).toBeInTheDocument();
  });

  it("has role='img' on the SVG", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    const svg = screen.getByTestId("sentiment-sparkline");
    expect(svg).toHaveAttribute("role", "img");
  });

  it("has a non-empty aria-label", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    const svg = screen.getByTestId("sentiment-sparkline");
    const label = svg.getAttribute("aria-label");
    expect(label).toBeTruthy();
    expect(label!.length).toBeGreaterThan(10);
  });

  it("renders a <title> element inside the SVG", () => {
    const { container } = render(<SentimentSparkline data={TWO_POINTS} />);
    const title = container.querySelector("title");
    expect(title).toBeInTheDocument();
    expect(title!.textContent!.length).toBeGreaterThan(0);
  });

  it("renders default dimensions (96×32)", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    const svg = screen.getByTestId("sentiment-sparkline");
    expect(svg).toHaveAttribute("width", "96");
    expect(svg).toHaveAttribute("height", "32");
  });

  it("renders custom dimensions", () => {
    render(<SentimentSparkline data={TWO_POINTS} width={120} height={48} />);
    const svg = screen.getByTestId("sentiment-sparkline");
    expect(svg).toHaveAttribute("width", "120");
    expect(svg).toHaveAttribute("height", "48");
  });

  it("forwards className to the SVG element", () => {
    render(<SentimentSparkline data={TWO_POINTS} className="opacity-50" />);
    expect(screen.getByTestId("sentiment-sparkline")).toHaveClass("opacity-50");
  });
});

describe("SentimentSparkline — series lines", () => {
  it("renders a polyline for each of the three default series", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    expect(screen.getByTestId("sparkline-line-positive")).toBeInTheDocument();
    expect(screen.getByTestId("sparkline-line-mixed")).toBeInTheDocument();
    expect(screen.getByTestId("sparkline-line-critical")).toBeInTheDocument();
  });

  it("renders a terminal dot for each series", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    expect(screen.getByTestId("sparkline-dot-positive")).toBeInTheDocument();
    expect(screen.getByTestId("sparkline-dot-mixed")).toBeInTheDocument();
    expect(screen.getByTestId("sparkline-dot-critical")).toBeInTheDocument();
  });

  it("only renders requested series when series prop is provided", () => {
    render(<SentimentSparkline data={TWO_POINTS} series={["positive"]} />);
    expect(screen.getByTestId("sparkline-line-positive")).toBeInTheDocument();
    expect(
      screen.queryByTestId("sparkline-line-mixed"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("sparkline-line-critical"),
    ).not.toBeInTheDocument();
  });

  it("renders two series when two are requested", () => {
    render(
      <SentimentSparkline data={TWO_POINTS} series={["positive", "critical"]} />,
    );
    expect(screen.getByTestId("sparkline-line-positive")).toBeInTheDocument();
    expect(screen.getByTestId("sparkline-line-critical")).toBeInTheDocument();
    expect(
      screen.queryByTestId("sparkline-line-mixed"),
    ).not.toBeInTheDocument();
  });

  it("polyline has a non-empty points attribute", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    const polyline = screen.getByTestId("sparkline-line-positive");
    const points = polyline.getAttribute("points");
    expect(points).toBeTruthy();
    expect(points!.length).toBeGreaterThan(0);
  });

  it("positive polyline has solid stroke (no dasharray)", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    const polyline = screen.getByTestId("sparkline-line-positive");
    // No strokeDasharray on the positive line
    expect(polyline).not.toHaveAttribute("stroke-dasharray");
  });

  it("mixed polyline has a stroke-dasharray", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    const polyline = screen.getByTestId("sparkline-line-mixed");
    expect(polyline).toHaveAttribute("stroke-dasharray");
  });

  it("critical polyline has a stroke-dasharray", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    const polyline = screen.getByTestId("sparkline-line-critical");
    expect(polyline).toHaveAttribute("stroke-dasharray");
  });
});

describe("SentimentSparkline — edge cases", () => {
  it("renders correctly with a single data point (no x-division by zero)", () => {
    expect(() =>
      render(<SentimentSparkline data={SINGLE_POINT} />),
    ).not.toThrow();
    expect(screen.getByTestId("sentiment-sparkline")).toBeInTheDocument();
  });

  it("renders terminal dot for single-point series", () => {
    render(<SentimentSparkline data={SINGLE_POINT} />);
    expect(screen.getByTestId("sparkline-dot-positive")).toBeInTheDocument();
  });

  it("renders without crash when all values are the same (domain collapse)", () => {
    expect(() =>
      render(<SentimentSparkline data={ALL_SAME} />),
    ).not.toThrow();
    expect(screen.getByTestId("sentiment-sparkline")).toBeInTheDocument();
  });

  it("renders correctly with 8 data points", () => {
    render(<SentimentSparkline data={EIGHT_POINTS} />);
    expect(screen.getByTestId("sentiment-sparkline")).toBeInTheDocument();
    expect(screen.getAllByTestId(/sparkline-line-/).length).toBe(3);
  });

  it("uses custom label in aria-label when label prop is provided", () => {
    const customLabel = "8-week positive trend summary";
    render(<SentimentSparkline data={TWO_POINTS} label={customLabel} />);
    const svg = screen.getByTestId("sentiment-sparkline");
    expect(svg).toHaveAttribute("aria-label", customLabel);
  });

  it("uses custom label in <title> element", () => {
    const customLabel = "Custom sparkline label";
    const { container } = render(
      <SentimentSparkline data={TWO_POINTS} label={customLabel} />,
    );
    const title = container.querySelector("title");
    expect(title!.textContent).toBe(customLabel);
  });

  it("auto-generates aria-label from last data point when no label prop", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    const svg = screen.getByTestId("sentiment-sparkline");
    const label = svg.getAttribute("aria-label")!;
    // Should mention the period count and recent values
    expect(label).toMatch(/2 period/i);
    expect(label).toContain("48");
    expect(label).toContain("17");
    expect(label).toContain("9");
  });

  it("auto-label mentions only requested series", () => {
    render(<SentimentSparkline data={TWO_POINTS} series={["positive"]} />);
    const svg = screen.getByTestId("sentiment-sparkline");
    const label = svg.getAttribute("aria-label")!;
    expect(label).toContain("48");
    // "mixed" and "critical" values should not appear when series excluded
    // (17 appears in "17" for mixed — but label only builds parts for active series)
    expect(label).not.toContain("mixed");
    expect(label).not.toContain("critical");
  });
});

describe("SentimentSparkline — SVG structure", () => {
  it("renders polylines as children of the SVG", () => {
    const { container } = render(<SentimentSparkline data={TWO_POINTS} />);
    const svg = container.querySelector("svg");
    const polylines = svg!.querySelectorAll("polyline");
    expect(polylines.length).toBe(3);
  });

  it("renders terminal dot circles as children of the SVG", () => {
    const { container } = render(<SentimentSparkline data={TWO_POINTS} />);
    const svg = container.querySelector("svg");
    const circles = svg!.querySelectorAll("circle");
    expect(circles.length).toBe(3);
  });

  it("SVG has viewBox attribute", () => {
    render(<SentimentSparkline data={TWO_POINTS} />);
    const svg = screen.getByTestId("sentiment-sparkline");
    expect(svg).toHaveAttribute("viewBox");
  });
});
