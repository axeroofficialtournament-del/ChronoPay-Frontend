import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { SlotList } from "./slot-list";
import { DENSITY_STORAGE_KEY } from "@/hooks/use-density";
import type { Slot } from "./types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/mock-path",
}));

const slots: Slot[] = [
  {
    id: "slot-density-1",
    title: "Product strategy call",
    dateLabel: "Tue, Apr 1",
    timeRange: "10:00-11:30",
    demand: "6 interested buyers",
    rate: "120 XLM / hr",
    status: "Healthy",
    durationMinutes: 90,
  },
  {
    id: "slot-density-2",
    title: "Code review",
    dateLabel: "Wed, Apr 2",
    timeRange: "14:00-15:00",
    demand: "2 interested buyers",
    rate: "90 XLM / hr",
    status: "Tight",
    durationMinutes: 60,
  },
];

function renderList() {
  return render(<SlotList slots={slots} />);
}

/** Class tokens the card picks up for a given mode. */
const CARD_PADDING = {
  compact: "sm:p-3",
  balanced: "sm:p-5",
  comfortable: "sm:p-6",
} as const;

describe("SlotList density modes", () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.density;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults to balanced and publishes the mode on the list and on <html>", () => {
    const { container } = renderList();

    const list = container.querySelector(".slot-list");
    expect(list).toHaveAttribute("data-density", "balanced");
    expect(document.documentElement.dataset.density).toBe("balanced");
  });

  it("switches to compact, persists the choice and mirrors it onto <html>", () => {
    const { container } = renderList();

    fireEvent.click(screen.getByRole("button", { name: "Compact density" }));

    expect(container.querySelector(".slot-list")).toHaveAttribute(
      "data-density",
      "compact",
    );
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe("compact");
    expect(document.documentElement.dataset.density).toBe("compact");
  });

  it("switches to comfortable on request", () => {
    const { container } = renderList();

    fireEvent.click(screen.getByRole("button", { name: "Comfortable density" }));

    expect(container.querySelector(".slot-list")).toHaveAttribute(
      "data-density",
      "comfortable",
    );
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe(
      "comfortable",
    );
  });

  it("honours a preference persisted by a previous visit", () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "compact");

    const { container } = renderList();

    expect(container.querySelector(".slot-list")).toHaveAttribute(
      "data-density",
      "compact",
    );
    expect(
      screen.getByRole("button", { name: "Compact density" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to balanced when the stored value is not a supported mode", () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, "ultra-dense");

    const { container } = renderList();

    expect(container.querySelector(".slot-list")).toHaveAttribute(
      "data-density",
      "balanced",
    );
  });

  it("tightens the row padding in compact and loosens it in comfortable", () => {
    const { container, unmount } = renderList();
    const balancedCard = container.querySelector("li > div") as HTMLElement;
    expect(balancedCard.className).toContain(CARD_PADDING.balanced);
    unmount();

    const compact = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Compact density" }));
    const compactCard = compact.container.querySelector("li > div") as HTMLElement;
    expect(compactCard.className).toContain(CARD_PADDING.compact);
    expect(compactCard.className).not.toContain(CARD_PADDING.balanced);
    compact.unmount();

    renderList();
    fireEvent.click(screen.getByRole("button", { name: "Comfortable density" }));
    const comfortableCard = document.querySelector("li > div") as HTMLElement;
    expect(comfortableCard.className).toContain(CARD_PADDING.comfortable);
  });

  it("opts rows out of transition animation when motion is reduced", () => {
    const { container } = renderList();

    const row = container.querySelector("li");
    expect(row?.className).toContain("motion-reduce:transition-none");
  });

  it("exposes the modes as an accessible toggle group with a single active mode", () => {
    renderList();

    const group = screen.getByRole("group", { name: "Density" });
    expect(group).toBeInTheDocument();

    const modes = ["Comfortable", "Balanced", "Compact"].map((label) =>
      screen.getByRole("button", { name: `${label} density` }),
    );
    expect(modes.map((b) => b.getAttribute("aria-pressed"))).toEqual([
      "false",
      "true",
      "false",
    ]);

    fireEvent.click(modes[2]);
    expect(screen.getByRole("button", { name: "Compact density" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Balanced density" }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
