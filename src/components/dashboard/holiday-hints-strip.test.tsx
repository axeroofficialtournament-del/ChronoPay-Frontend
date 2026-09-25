import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HolidayHintsStrip } from "./holiday-hints-strip";
import type { HolidayHint, RegionInfo } from "./types";

// ─── Test data ───────────────────────────────────────────────────────────────

const usRegion: RegionInfo = { country: "United States", code: "US", name: "United States" };
const ngRegion: RegionInfo = { country: "Nigeria", code: "NG", name: "Nigeria" };

const sampleHolidays: HolidayHint[] = [
  {
    id: "h-1",
    name: "New Year's Day",
    date: "2027-01-01",
    dateLabel: "Jan 1, 2027",
  },
  {
    id: "h-2",
    name: "Martin Luther King Jr. Day",
    date: "2027-01-19",
    dateLabel: "Jan 19, 2027",
    isMoving: true,
  },
  {
    id: "h-3",
    name: "Memorial Day",
    date: "2027-05-31",
    dateLabel: "May 31, 2027",
    isMoving: true,
  },
];

const emptyHolidays: HolidayHint[] = [];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("HolidayHintsStrip", () => {
  // ── Rendering ────────────────────────────────────────────────────────────

  it("renders the heading and region eyebrow", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    expect(
      screen.getByRole("heading", { name: /Upcoming Holidays/i })
    ).toBeInTheDocument();
    expect(screen.getByText("United States (US)")).toBeInTheDocument();
  });

  it("renders all holiday chips", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    expect(screen.getByText("New Year's Day")).toBeInTheDocument();
    expect(screen.getByText("Martin Luther King Jr. Day")).toBeInTheDocument();
    expect(screen.getByText("Memorial Day")).toBeInTheDocument();
  });

  it("renders date labels for each holiday", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    expect(screen.getByText("Jan 1, 2027")).toBeInTheDocument();
    expect(screen.getByText("Jan 19, 2027")).toBeInTheDocument();
    expect(screen.getByText("May 31, 2027")).toBeInTheDocument();
  });

  // ── Region display ───────────────────────────────────────────────────────

  it("shows region code badge", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    expect(screen.getByText("Region: US")).toBeInTheDocument();
  });

  it("shows correct region for different region", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={ngRegion} />);
    expect(screen.getByText("Nigeria (NG)")).toBeInTheDocument();
  });

  // ── Empty state ──────────────────────────────────────────────────────────

  it("renders empty state when no holidays", () => {
    render(<HolidayHintsStrip holidays={emptyHolidays} region={usRegion} />);
    expect(
      screen.getByText(/No upcoming public holidays for United States/)
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("empty state links to settings", () => {
    render(<HolidayHintsStrip holidays={emptyHolidays} region={usRegion} />);
    const link = screen.getByRole("link", { name: "Settings" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard/settings");
  });

  it("empty state description reflects no holidays", () => {
    render(<HolidayHintsStrip holidays={emptyHolidays} region={usRegion} />);
    expect(
      screen.getByText(/No upcoming public holidays in your region/)
    ).toBeInTheDocument();
  });

  it("non-empty description mentions planning ahead", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    expect(screen.getByText(/Plan ahead/)).toBeInTheDocument();
  });

  // ── Moveable badge ───────────────────────────────────────────────────────

  it("renders 'Moveable' badge for moving holidays", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    const moveableBadges = screen.getAllByText("Moveable");
    expect(moveableBadges).toHaveLength(2);
  });

  it("does not render 'Moveable' badge for fixed-date holidays", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    // "New Year's Day" is fixed — only 2 moveable badges should exist
    const moveableBadges = screen.getAllByText("Moveable");
    expect(moveableBadges).toHaveLength(2);
  });

  it("moveable badge has accessible label", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    const badge = screen.getAllByLabelText(
      "Moveable holiday — date changes each year"
    );
    expect(badge).toHaveLength(2);
  });

  // ── Block day buttons ────────────────────────────────────────────────────

  it("renders 'Block day' buttons for each holiday", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    const blockButtons = screen.getAllByRole("link", { name: /Block/ });
    expect(blockButtons).toHaveLength(3);
  });

  it("block day button links to correct date", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    const link = screen.getByRole("link", {
      name: "Block New Year's Day — Jan 1, 2027",
    });
    expect(link).toHaveAttribute("href", "/dashboard?block=2027-01-01");
  });

  // ── Accessibility ────────────────────────────────────────────────────────

  it("renders section with aria-labelledby pointing to heading", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    const heading = screen.getByRole("heading", { name: /Upcoming Holidays/i });
    expect(heading).toHaveAttribute("id");
    const section = heading.closest("section");
    expect(section).toHaveAttribute("aria-labelledby", heading.id);
  });

  it("renders list with accessible label when holidays present", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    const list = screen.getByRole("list", {
      name: "Upcoming public holidays for United States",
    });
    expect(list).toBeInTheDocument();
  });

  it("does not render a list when empty", () => {
    render(<HolidayHintsStrip holidays={emptyHolidays} region={usRegion} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders help popover trigger for holiday hints", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    expect(
      screen.getByLabelText("Help: what are holiday hints?")
    ).toBeInTheDocument();
  });

  it("renders help popover for region holidays", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    expect(
      screen.getByLabelText("Help: how are regional holidays determined?")
    ).toBeInTheDocument();
  });

  it("region badge has accessible label", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    expect(
      screen.getByLabelText("Holidays sourced for United States")
    ).toBeInTheDocument();
  });

  it("uses semantic list items for holidays", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });

  // ── Styling ──────────────────────────────────────────────────────────────

  it("applies dark theme border classes", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    const section = document.querySelector("section");
    expect(section).toHaveClass("border-white/10");
  });

  // ── Responsive layout ────────────────────────────────────────────────────

  it("renders with responsive padding classes", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    const section = document.querySelector("section");
    expect(section?.className).toMatch(/p-4/);
    expect(section?.className).toMatch(/sm:p-5/);
    expect(section?.className).toMatch(/xl:p-6/);
  });

  // ── className prop ───────────────────────────────────────────────────────

  it("appends custom className to the section", () => {
    render(
      <HolidayHintsStrip
        holidays={sampleHolidays}
        region={usRegion}
        className="my-custom-class"
      />
    );
    const section = document.querySelector("section");
    expect(section).toHaveClass("my-custom-class");
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  it("handles a single holiday", () => {
    const single: HolidayHint[] = [
      { id: "h-1", name: "New Year's Day", date: "2027-01-01", dateLabel: "Jan 1, 2027" },
    ];
    render(<HolidayHintsStrip holidays={single} region={usRegion} />);
    expect(screen.getByText("New Year's Day")).toBeInTheDocument();
    const blockButtons = screen.getAllByRole("link", { name: /Block/ });
    expect(blockButtons).toHaveLength(1);
  });

  it("handles holidays with no moving holidays", () => {
    const fixed: HolidayHint[] = [
      { id: "h-1", name: "New Year's Day", date: "2027-01-01", dateLabel: "Jan 1, 2027" },
      { id: "h-2", name: "Independence Day", date: "2027-07-04", dateLabel: "Jul 4, 2027" },
    ];
    render(<HolidayHintsStrip holidays={fixed} region={usRegion} />);
    expect(screen.queryByText("Moveable")).not.toBeInTheDocument();
  });

  it("handles a long holiday name without overflow issues", () => {
    const long: HolidayHint[] = [
      {
        id: "h-1",
        name: "Anniversary of the Restoration of Independence",
        date: "2027-08-20",
        dateLabel: "Aug 20, 2027",
      },
    ];
    render(<HolidayHintsStrip holidays={long} region={usRegion} />);
    expect(
      screen.getByText("Anniversary of the Restoration of Independence")
    ).toBeInTheDocument();
  });

  // ── Block day: hidden on mobile, visible on sm+ ─────────────────────────

  it("'Block day' text is visually hidden on mobile (hidden sm:inline)", () => {
    render(<HolidayHintsStrip holidays={sampleHolidays} region={usRegion} />);
    const blockLabels = document.querySelectorAll(".sm\\:inline");
    // At least some "Block day" span elements should have this class
    const blockDaySpans = Array.from(blockLabels).filter(
      (el) => el.textContent === "Block day"
    );
    expect(blockDaySpans.length).toBeGreaterThan(0);
  });
});
