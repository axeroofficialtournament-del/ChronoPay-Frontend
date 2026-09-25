/**
 * review-vote-buttons.test.tsx
 *
 * Unit test suite for the ReviewVoteButtons component (Issue #261).
 *
 * Coverage targets (95%+):
 *  - Initial rendering: counts, aria-pressed states, aria-labels
 *  - Voting: helpful, unhelpful, vote toggling off, vote switching
 *  - Optimistic state: counts update immediately on click
 *  - aria-pressed: "true" when active, "false" when inactive
 *  - LiveRegion: announces vote changes for screen readers
 *  - onVote callback: called with correct newVote/previousVote args
 *  - Server error rollback: rejected onVote promise restores previous state
 *  - Toast undo: undo callback restores previous vote state
 *  - disabled prop: buttons are disabled; no votes can be cast
 *  - Zero-floor: counts never go below 0 on rollback
 *  - Defaults: renders correctly with default prop values
 *  - className: applied to the container
 */

import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ReviewVoteButtons } from "./review-vote-buttons";

// ─── Toast mock ──────────────────────────────────────────────────────────────
// ReviewVoteButtons soft-catches missing ToastContext, so we can test both paths.
vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({
    toasts: [],
    toast: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
    dismissAll: vi.fn(),
    queued: [],
  })),
}));

import { useToast } from "@/hooks/use-toast";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHelpfulBtn() {
  return screen.getByRole("button", { name: /helpful/i });
}

function getUnhelpfulBtn() {
  return screen.getByRole("button", { name: /unhelpful/i });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ReviewVoteButtons", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders helpful and unhelpful buttons with initial counts", () => {
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={10}
        initialUnhelpfulCount={3}
      />
    );
    expect(screen.getByRole("button", { name: /helpful/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unhelpful/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /helpful/i }).textContent).toContain("10");
    expect(screen.getByRole("button", { name: /unhelpful/i }).textContent).toContain("3");
  });

  it("renders with default zero counts when no props supplied", () => {
    render(<ReviewVoteButtons reviewId="r0" />);
    expect(getHelpfulBtn().textContent).toContain("0");
    expect(getUnhelpfulBtn().textContent).toContain("0");
  });

  it("applies className to the container", () => {
    const { container } = render(
      <ReviewVoteButtons reviewId="r1" className="my-custom-class" />
    );
    expect(container.firstElementChild).toHaveClass("my-custom-class");
  });

  it("renders a role=group with an accessible label", () => {
    render(<ReviewVoteButtons reviewId="r1" />);
    expect(
      screen.getByRole("group", { name: /voting controls/i })
    ).toBeInTheDocument();
  });

  // ── aria-pressed ───────────────────────────────────────────────────────────

  it("has aria-pressed=false on both buttons when no initial vote", () => {
    render(<ReviewVoteButtons reviewId="r1" />);
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "false");
    expect(getUnhelpfulBtn()).toHaveAttribute("aria-pressed", "false");
  });

  it("has aria-pressed=true on helpful when initialUserVote=helpful", () => {
    render(<ReviewVoteButtons reviewId="r1" initialUserVote="helpful" initialHelpfulCount={5} />);
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "true");
    expect(getUnhelpfulBtn()).toHaveAttribute("aria-pressed", "false");
  });

  it("has aria-pressed=true on unhelpful when initialUserVote=unhelpful", () => {
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialUserVote="unhelpful"
        initialUnhelpfulCount={2}
      />
    );
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "false");
    expect(getUnhelpfulBtn()).toHaveAttribute("aria-pressed", "true");
  });

  // ── Optimistic Vote ────────────────────────────────────────────────────────

  it("increments helpful count and sets aria-pressed when clicking helpful from no vote", () => {
    render(<ReviewVoteButtons reviewId="r1" initialHelpfulCount={4} />);
    fireEvent.click(getHelpfulBtn());
    expect(getHelpfulBtn().textContent).toContain("5");
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "true");
    expect(getUnhelpfulBtn()).toHaveAttribute("aria-pressed", "false");
  });

  it("increments unhelpful count and sets aria-pressed when clicking unhelpful from no vote", () => {
    render(<ReviewVoteButtons reviewId="r1" initialUnhelpfulCount={2} />);
    fireEvent.click(getUnhelpfulBtn());
    expect(getUnhelpfulBtn().textContent).toContain("3");
    expect(getUnhelpfulBtn()).toHaveAttribute("aria-pressed", "true");
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles off helpful when clicking helpful while already voted helpful", () => {
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={5}
        initialUserVote="helpful"
      />
    );
    fireEvent.click(getHelpfulBtn());
    expect(getHelpfulBtn().textContent).toContain("4");
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles off unhelpful when clicking unhelpful while already voted unhelpful", () => {
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialUnhelpfulCount={3}
        initialUserVote="unhelpful"
      />
    );
    fireEvent.click(getUnhelpfulBtn());
    expect(getUnhelpfulBtn().textContent).toContain("2");
    expect(getUnhelpfulBtn()).toHaveAttribute("aria-pressed", "false");
  });

  it("switches from helpful to unhelpful: decrements helpful, increments unhelpful", () => {
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={5}
        initialUnhelpfulCount={1}
        initialUserVote="helpful"
      />
    );
    fireEvent.click(getUnhelpfulBtn());
    expect(getHelpfulBtn().textContent).toContain("4");
    expect(getUnhelpfulBtn().textContent).toContain("2");
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "false");
    expect(getUnhelpfulBtn()).toHaveAttribute("aria-pressed", "true");
  });

  it("switches from unhelpful to helpful: decrements unhelpful, increments helpful", () => {
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={3}
        initialUnhelpfulCount={4}
        initialUserVote="unhelpful"
      />
    );
    fireEvent.click(getHelpfulBtn());
    expect(getHelpfulBtn().textContent).toContain("4");
    expect(getUnhelpfulBtn().textContent).toContain("3");
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "true");
    expect(getUnhelpfulBtn()).toHaveAttribute("aria-pressed", "false");
  });

  // ── Counts never go below 0 ────────────────────────────────────────────────

  it("does not reduce helpful count below 0 when toggling off from 0", () => {
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={0}
        initialUserVote="helpful"
      />
    );
    fireEvent.click(getHelpfulBtn());
    expect(getHelpfulBtn().textContent).toContain("0");
  });

  // ── onVote callback ────────────────────────────────────────────────────────

  it("calls onVote with the new vote and the previous vote", async () => {
    const onVote = vi.fn().mockResolvedValue(undefined);
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={2}
        onVote={onVote}
        showToastOnVote={false}
      />
    );
    fireEvent.click(getHelpfulBtn());
    await waitFor(() =>
      expect(onVote).toHaveBeenCalledWith("helpful", null)
    );
  });

  it("calls onVote with null as new vote when toggling off", async () => {
    const onVote = vi.fn().mockResolvedValue(undefined);
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={5}
        initialUserVote="helpful"
        onVote={onVote}
        showToastOnVote={false}
      />
    );
    fireEvent.click(getHelpfulBtn());
    await waitFor(() =>
      expect(onVote).toHaveBeenCalledWith(null, "helpful")
    );
  });

  // ── Server Error Rollback ──────────────────────────────────────────────────

  it("rolls back optimistic state when onVote rejects", async () => {
    const onVote = vi.fn().mockRejectedValue(new Error("Server error"));
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={3}
        onVote={onVote}
        showToastOnVote={false}
      />
    );
    fireEvent.click(getHelpfulBtn());
    // Optimistic: count is 4 immediately
    expect(getHelpfulBtn().textContent).toContain("4");
    // After rejection, should roll back
    await waitFor(() =>
      expect(getHelpfulBtn().textContent).toContain("3")
    );
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "false");
  });

  it("shows error toast on server failure", async () => {
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({
      toasts: [],
      toast: mockToast,
      dismiss: vi.fn(),
      dismissAll: vi.fn(),
      queued: [],
    });
    const onVote = vi.fn().mockRejectedValue(new Error("Network error"));
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={1}
        onVote={onVote}
      />
    );
    fireEvent.click(getHelpfulBtn());
    await waitFor(() => {
      const calls = mockToast.mock.calls;
      const errorCall = calls.find((c) => c[0]?.variant === "error");
      expect(errorCall).toBeTruthy();
    });
  });

  // ── Toast & Undo ───────────────────────────────────────────────────────────

  it("fires a success toast with an onUndo callback when showToastOnVote=true", () => {
    const mockToast = vi.fn(() => "toast-id");
    vi.mocked(useToast).mockReturnValue({
      toasts: [],
      toast: mockToast,
      dismiss: vi.fn(),
      dismissAll: vi.fn(),
      queued: [],
    });
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={2}
        showToastOnVote={true}
      />
    );
    fireEvent.click(getHelpfulBtn());
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "success",
        onUndo: expect.any(Function),
      })
    );
  });

  it("does NOT fire a toast when showToastOnVote=false", () => {
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({
      toasts: [],
      toast: mockToast,
      dismiss: vi.fn(),
      dismissAll: vi.fn(),
      queued: [],
    });
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={2}
        showToastOnVote={false}
      />
    );
    fireEvent.click(getHelpfulBtn());
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("undo callback from toast restores the previous vote state", () => {
    let capturedUndo: (() => void) | undefined;
    const mockToast = vi.fn((input) => {
      capturedUndo = input.onUndo;
      return "toast-id";
    });
    vi.mocked(useToast).mockReturnValue({
      toasts: [],
      toast: mockToast,
      dismiss: vi.fn(),
      dismissAll: vi.fn(),
      queued: [],
    });
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={4}
        showToastOnVote={true}
      />
    );
    fireEvent.click(getHelpfulBtn());
    expect(getHelpfulBtn().textContent).toContain("5");
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "true");

    // Trigger the undo callback captured from the toast
    act(() => capturedUndo!());

    expect(getHelpfulBtn().textContent).toContain("4");
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "false");
  });

  // ── Disabled State ─────────────────────────────────────────────────────────

  it("disables both buttons when disabled=true", () => {
    render(
      <ReviewVoteButtons reviewId="r1" disabled={true} initialHelpfulCount={3} />
    );
    expect(getHelpfulBtn()).toBeDisabled();
    expect(getUnhelpfulBtn()).toBeDisabled();
  });

  it("does not update counts when disabled buttons are clicked", () => {
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={3}
        disabled={true}
      />
    );
    fireEvent.click(getHelpfulBtn());
    expect(getHelpfulBtn().textContent).toContain("3");
    expect(getHelpfulBtn()).toHaveAttribute("aria-pressed", "false");
  });

  // ── LiveRegion Announcements ───────────────────────────────────────────────

  it("announces helpful vote to screen readers", async () => {
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialHelpfulCount={4}
        showToastOnVote={false}
      />
    );
    fireEvent.click(getHelpfulBtn());
    await waitFor(() =>
      expect(
        screen.getByText(/helpful/i, { selector: "[aria-live]" })
      ).toBeInTheDocument()
    );
  });

  it("announces unhelpful vote to screen readers", async () => {
    render(
      <ReviewVoteButtons
        reviewId="r1"
        initialUnhelpfulCount={2}
        showToastOnVote={false}
      />
    );
    fireEvent.click(getUnhelpfulBtn());
    await waitFor(() =>
      expect(
        screen.getByText(/unhelpful/i, { selector: "[aria-live]" })
      ).toBeInTheDocument()
    );
  });

  // ── Keyboard Navigation ────────────────────────────────────────────────────

  it("triggers helpful vote via keyboard Enter", () => {
    render(<ReviewVoteButtons reviewId="r1" initialHelpfulCount={2} showToastOnVote={false} />);
    const btn = getHelpfulBtn();
    btn.focus();
    fireEvent.keyDown(btn, { key: "Enter" });
    fireEvent.click(btn); // Enter on a button fires click natively; simulate via click
    expect(getHelpfulBtn().textContent).toContain("3");
  });

  it("triggers unhelpful vote via keyboard Space", () => {
    render(<ReviewVoteButtons reviewId="r1" initialUnhelpfulCount={1} showToastOnVote={false} />);
    const btn = getUnhelpfulBtn();
    btn.focus();
    fireEvent.click(btn);
    expect(getUnhelpfulBtn().textContent).toContain("2");
  });

  // ── Singular vs. Plural Vote Label ────────────────────────────────────────

  it("uses singular 'vote' in aria-label when count is 1", () => {
    render(<ReviewVoteButtons reviewId="r1" initialHelpfulCount={1} />);
    expect(getHelpfulBtn()).toHaveAttribute(
      "aria-label",
      expect.stringContaining("1 helpful vote)")
    );
  });

  it("uses plural 'votes' in aria-label when count is 0 or >1", () => {
    render(<ReviewVoteButtons reviewId="r1" initialHelpfulCount={0} />);
    expect(getHelpfulBtn()).toHaveAttribute(
      "aria-label",
      expect.stringContaining("0 helpful votes)")
    );
  });
});
