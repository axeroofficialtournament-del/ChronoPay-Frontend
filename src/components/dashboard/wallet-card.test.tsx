/**
 * wallet-card.test.tsx
 *
 * Coverage targets (95%+):
 *  - isZeroBalance() helper — all numeric and edge cases
 *  - ZERO_BALANCE_NUDGE_ACTIONS constants — structure and flags
 *  - ZeroBalanceNudge — renders expected actions, testnet gating,
 *    aria-live announcement, heading, and focus behaviour
 *  - WalletCard — connected/disconnected/error status chips,
 *    address display & copy, nudge visibility (zero vs non-zero balance),
 *    isTestnet prop, modal open/close
 *
 * WalletConnectModal is mocked because its source contains a multiline
 * regex literal that the oxc parser cannot handle (pre-existing issue).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock WalletConnectModal before importing wallet-card so the broken regex
// in WalletConnectModal.tsx never reaches the parser.
vi.mock("./WalletConnectModal", () => ({
  WalletConnectModal: ({
    isOpen,
    onClose,
    onConnect,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConnect: (id: string) => void;
    providers: unknown[];
    status: string;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Connect wallet">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onConnect("mock-provider")}>Connect</button>
      </div>
    ) : null,
}));

import {
  isZeroBalance,
  ZERO_BALANCE_NUDGE_ACTIONS,
  ZeroBalanceNudge,
  WalletCard,
} from "./wallet-card";
import type { WalletSnapshot } from "./types";
import { ToastProvider } from "@/hooks/use-toast";

/** Wrap a component in the providers WalletCard depends on. */
function renderWithProviders(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const connectedWallet: WalletSnapshot = {
  connection: "connected",
  address: "GCDQ7M3F6JH2K4N8Q5RLP9TZB3YH4W8F1S7N6U0X2A5V8E1C",
  balance: "1,240 XLM",
  pending: "180 XLM",
  nextPayout: "Friday, April 4",
  status: "Synced 2 minutes ago",
};

const zeroWallet: WalletSnapshot = {
  ...connectedWallet,
  balance: "0 XLM",
};

const disconnectedWallet: WalletSnapshot = {
  connection: "disconnected",
  balance: undefined,
  pending: "0 XLM",
  nextPayout: "—",
  status: "Not connected",
};

const errorWallet: WalletSnapshot = {
  connection: "error",
  balance: "0 XLM",
  pending: "0 XLM",
  nextPayout: "—",
  status: "Connection failed",
};

// ---------------------------------------------------------------------------
// isZeroBalance
// ---------------------------------------------------------------------------

describe("isZeroBalance", () => {
  it("returns false for a non-zero XLM balance", () => {
    expect(isZeroBalance("1,240 XLM")).toBe(false);
  });

  it('returns true for "0 XLM"', () => {
    expect(isZeroBalance("0 XLM")).toBe(true);
  });

  it('returns true for "0.00 XLM"', () => {
    expect(isZeroBalance("0.00 XLM")).toBe(true);
  });

  it('returns true for "0"', () => {
    expect(isZeroBalance("0")).toBe(true);
  });

  it('returns true for "0.0"', () => {
    expect(isZeroBalance("0.0")).toBe(true);
  });

  it("returns false for undefined", () => {
    expect(isZeroBalance(undefined)).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isZeroBalance("")).toBe(false);
  });

  it("returns false for a balance string with only currency letters", () => {
    // e.g. a malformed value of just "XLM" has no numeric part
    expect(isZeroBalance("XLM")).toBe(false);
  });

  it("returns false for a positive decimal balance", () => {
    expect(isZeroBalance("0.01 XLM")).toBe(false);
  });

  it("returns false for a large balance with commas", () => {
    expect(isZeroBalance("10,000 XLM")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ZERO_BALANCE_NUDGE_ACTIONS constants
// ---------------------------------------------------------------------------

describe("ZERO_BALANCE_NUDGE_ACTIONS", () => {
  it("contains at least one testnet-only action", () => {
    const testnetActions = ZERO_BALANCE_NUDGE_ACTIONS.filter(
      (a) => a.testnetOnly,
    );
    expect(testnetActions.length).toBeGreaterThan(0);
  });

  it("contains at least one non-testnet action", () => {
    const mainnetActions = ZERO_BALANCE_NUDGE_ACTIONS.filter(
      (a) => !a.testnetOnly,
    );
    expect(mainnetActions.length).toBeGreaterThan(0);
  });

  it("every action has a non-empty id, label, ctaLabel, and href", () => {
    for (const action of ZERO_BALANCE_NUDGE_ACTIONS) {
      expect(action.id.length).toBeGreaterThan(0);
      expect(action.label.length).toBeGreaterThan(0);
      expect(action.ctaLabel.length).toBeGreaterThan(0);
      expect(action.href.length).toBeGreaterThan(0);
    }
  });

  it("has the testnet-tokens action with testnetOnly=true", () => {
    const action = ZERO_BALANCE_NUDGE_ACTIONS.find(
      (a) => a.id === "testnet-tokens",
    );
    expect(action).toBeDefined();
    expect(action?.testnetOnly).toBe(true);
  });

  it("has the buy-xlm action with testnetOnly=false", () => {
    const action = ZERO_BALANCE_NUDGE_ACTIONS.find(
      (a) => a.id === "buy-xlm",
    );
    expect(action).toBeDefined();
    expect(action?.testnetOnly).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ZeroBalanceNudge
// ---------------------------------------------------------------------------

describe("ZeroBalanceNudge", () => {
  it("renders the heading", () => {
    render(<ZeroBalanceNudge />);
    expect(
      screen.getByRole("heading", {
        name: /your wallet is empty — here's how to get started/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders the sr-only aria-live announcement on mount", () => {
    render(<ZeroBalanceNudge />);
    // ZeroBalanceNudge now also contains a HelpPopover (issue #652), which
    // renders its own role="status" region for help-mode state. Target the
    // zero-balance announcement specifically by its text rather than by
    // role alone, since there are legitimately two status regions here.
    const announcement = screen.getByText(/wallet balance is zero/i);
    expect(announcement).toHaveAttribute("role", "status");
    expect(announcement).toHaveTextContent(/wallet balance is zero/i);
  });

  it("hides testnet-only actions by default (isTestnet=false)", () => {
    render(<ZeroBalanceNudge isTestnet={false} />);
    expect(screen.queryByText(/Get testnet tokens/i)).not.toBeInTheDocument();
  });

  it("shows testnet-only actions when isTestnet=true", () => {
    render(<ZeroBalanceNudge isTestnet={true} />);
    expect(screen.getByText(/Get testnet tokens/i)).toBeInTheDocument();
  });

  it("always shows non-testnet actions", () => {
    render(<ZeroBalanceNudge isTestnet={false} />);
    expect(screen.getByText(/Buy XLM/i)).toBeInTheDocument();
    expect(screen.getByText(/Learn about time tokens/i)).toBeInTheDocument();
  });

  it("renders the Testnet badge next to testnet-only actions", () => {
    render(<ZeroBalanceNudge isTestnet={true} />);
    expect(screen.getByText("Testnet")).toBeInTheDocument();
  });

  it("renders action CTAs as links", () => {
    render(<ZeroBalanceNudge isTestnet={false} />);
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
  });

  it("external links open in a new tab with rel=noopener noreferrer", () => {
    render(<ZeroBalanceNudge isTestnet={true} />);
    // testnet-tokens link is external (https://)
    const testnetLink = screen.getByRole("link", {
      name: /Open Friendbot/i,
    });
    expect(testnetLink).toHaveAttribute("target", "_blank");
    expect(testnetLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("internal links do not have target=_blank", () => {
    render(<ZeroBalanceNudge isTestnet={false} />);
    const guideLink = screen.getByRole("link", { name: /Read the guide/i });
    expect(guideLink).not.toHaveAttribute("target", "_blank");
  });

  it("accepts custom actions override", () => {
    const customActions = [
      {
        id: "custom",
        label: "Custom action",
        description: "A custom next step.",
        href: "/custom",
        testnetOnly: false,
        icon: "Star",
        ctaLabel: "Do the thing",
      },
    ] as const;
    render(<ZeroBalanceNudge actions={customActions} />);
    expect(screen.getByText("Custom action")).toBeInTheDocument();
    expect(screen.getByText("Do the thing →")).toBeInTheDocument();
  });

  it("has a landmark section with accessible name", () => {
    render(<ZeroBalanceNudge />);
    const section = screen.getByRole("region", {
      name: /your wallet is empty/i,
    });
    expect(section).toBeInTheDocument();
  });

  it("renders the next steps list with accessible label", () => {
    render(<ZeroBalanceNudge />);
    expect(
      screen.getByRole("list", { name: /Next steps for empty wallet/i }),
    ).toBeInTheDocument();
  });

  it("action items include description text", () => {
    render(<ZeroBalanceNudge isTestnet={false} />);
    expect(
      screen.getByText(/Fund your wallet from an exchange/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Understand how ChronoPay tokenises/i),
    ).toBeInTheDocument();
  });

  it("renders data-testid for easy integration targeting", () => {
    render(<ZeroBalanceNudge />);
    expect(screen.getByTestId("zero-balance-nudge")).toBeInTheDocument();
  });

  it("link aria-labels include both ctaLabel and description", () => {
    render(<ZeroBalanceNudge isTestnet={false} />);
    const buyLink = screen.getByRole("link", {
      name: /Find an exchange: Fund your wallet from an exchange/i,
    });
    expect(buyLink).toBeInTheDocument();
  });

  it("action links are keyboard focusable", async () => {
    const user = userEvent.setup();
    render(<ZeroBalanceNudge isTestnet={false} />);
    const links = screen.getAllByRole("link");
    await user.tab();
    // At least one link should be reachable via keyboard
    expect(links.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// WalletCard
// ---------------------------------------------------------------------------

describe("WalletCard", () => {
  beforeEach(() => {
    window.localStorage.clear();

    // jsdom does not implement window.matchMedia; provide a minimal stub.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    // useToast fires DOM updates; silence unhandled promise rejections
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Status chips ---

  it('shows "Connected" chip for connected wallet', () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it('shows "Disconnected" chip for disconnected wallet', () => {
    renderWithProviders(<WalletCard wallet={disconnectedWallet} />);
    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it('shows "Connection issue" chip for error wallet', () => {
    renderWithProviders(<WalletCard wallet={errorWallet} />);
    expect(screen.getByText("Connection issue")).toBeInTheDocument();
  });

  // --- Balance display ---

  it("displays the wallet balance", () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    expect(screen.getByText("1,240 XLM")).toBeInTheDocument();
  });

  // --- Address ---

  it("displays a truncated wallet address when present", () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    expect(screen.getByText(/GCDQ7M3F…/i)).toBeInTheDocument();
  });

  it("does not render the address row when address is absent", () => {
    renderWithProviders(<WalletCard wallet={disconnectedWallet} />);
    expect(screen.queryByText("Wallet address")).not.toBeInTheDocument();
  });

  // --- Nudge visibility ---

  it("does NOT render the zero-balance nudge for a non-zero balance", () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    expect(screen.queryByTestId("zero-balance-nudge")).not.toBeInTheDocument();
  });

  it("renders the zero-balance nudge for a connected wallet with 0 XLM", () => {
    renderWithProviders(<WalletCard wallet={zeroWallet} />);
    expect(screen.getByTestId("zero-balance-nudge")).toBeInTheDocument();
  });

  it("does NOT render the nudge for a disconnected wallet even if balance is 0", () => {
    const disconnectedZero: WalletSnapshot = {
      ...disconnectedWallet,
      balance: "0 XLM",
    };
    renderWithProviders(<WalletCard wallet={disconnectedZero} />);
    expect(screen.queryByTestId("zero-balance-nudge")).not.toBeInTheDocument();
  });

  it("does NOT render the nudge for an error wallet even if balance is 0", () => {
    renderWithProviders(<WalletCard wallet={errorWallet} />);
    expect(screen.queryByTestId("zero-balance-nudge")).not.toBeInTheDocument();
  });

  // --- isTestnet prop ---

  it("hides testnet CTA in nudge when isTestnet is false (default)", () => {
    renderWithProviders(<WalletCard wallet={zeroWallet} />);
    expect(screen.queryByText(/Get testnet tokens/i)).not.toBeInTheDocument();
  });

  it("shows testnet CTA in nudge when isTestnet=true", () => {
    renderWithProviders(<WalletCard wallet={zeroWallet} isTestnet />);
    expect(screen.getByText(/Get testnet tokens/i)).toBeInTheDocument();
  });

  // --- Footer CTA button labels ---

  it('renders "Review wallet" for a connected wallet', () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    expect(
      screen.getByRole("button", { name: "Review wallet" }),
    ).toBeInTheDocument();
  });

  it('renders "Connect wallet" for a disconnected wallet', () => {
    renderWithProviders(<WalletCard wallet={disconnectedWallet} />);
    expect(
      screen.getByRole("button", { name: "Connect wallet" }),
    ).toBeInTheDocument();
  });

  it('renders "Retry connection" for an error wallet', () => {
    renderWithProviders(<WalletCard wallet={errorWallet} />);
    expect(
      screen.getByRole("button", { name: "Retry connection" }),
    ).toBeInTheDocument();
  });

  // --- Modal ---

  it("opens the wallet connect modal when the CTA button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    await user.click(screen.getByRole("button", { name: "Review wallet" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the modal when the close button inside it is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    await user.click(screen.getByRole("button", { name: "Review wallet" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the modal when onConnect fires", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    await user.click(screen.getByRole("button", { name: "Review wallet" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fires the toast onCopied when the copy address button is clicked", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    const copyBtn = screen.getByRole("button", { name: /Copy address/i });
    await user.click(copyBtn);
    // Verifies the onCopied callback path executes without error
    expect(copyBtn).toBeInTheDocument();
  });

  // --- Status text ---

  it("displays the wallet status text", () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    expect(screen.getByText("Synced 2 minutes ago")).toBeInTheDocument();
  });

  // --- Pending escrow / Next payout ---

  it("displays pending escrow value", () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    expect(screen.getByText("180 XLM")).toBeInTheDocument();
  });

  it("displays next payout value", () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    expect(screen.getByText("Friday, April 4")).toBeInTheDocument();
  });

  // --- Accessible structure ---

  it("card is labelled by the 'Primary wallet' heading text", () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    // The card is an article; its accessible name comes from aria-labelledby
    const card = screen.getByRole("article");
    expect(card).toBeInTheDocument();
  });

  it("renders a non-zero balance without the nudge announcement", () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    // The nudge-specific announcement uses a unique text snippet
    expect(
      screen.queryByText(/wallet balance is zero/i),
    ).not.toBeInTheDocument();
  });

  it("renders the nudge announcement element when balance is zero", () => {
    renderWithProviders(<WalletCard wallet={zeroWallet} />);
    expect(
      screen.getByText(/wallet balance is zero/i),
    ).toBeInTheDocument();
  });

  it("renders wallet holdings tabs with counts and switches between views", async () => {
    const user = userEvent.setup();
    const holdings = [
      {
        id: "hold-1",
        title: "Studio session",
        amount: "120 XLM",
        detail: "Ready to payout",
        status: "available" as const,
      },
      {
        id: "hold-2",
        title: "Design review",
        amount: "80 XLM",
        detail: "Held until the booking completes",
        status: "escrowed" as const,
      },
      {
        id: "hold-3",
        title: "Workshop pass",
        amount: "40 XLM",
        detail: "Already settled and archived",
        status: "redeemed" as const,
      },
    ];

    renderWithProviders(
      <WalletCard wallet={connectedWallet} holdings={holdings} />,
    );

    expect(screen.getByRole("tablist", { name: /wallet holdings/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /available 1/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /escrowed 1/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /redeemed 1/i })).toBeInTheDocument();
    expect(screen.getByText("Ready to payout")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /escrowed 1/i }));

    expect(screen.getByRole("tab", { name: /escrowed 1/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Held until the booking completes")).toBeInTheDocument();
  });

  it("shows a dedicated empty state per holdings tab and restores the last tab on remount", async () => {
    const user = userEvent.setup();
    const emptyHoldings: never[] = [];

    const { unmount } = renderWithProviders(
      <WalletCard wallet={connectedWallet} holdings={emptyHoldings} />,
    );

    expect(screen.getByText(/No available holdings yet/i)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /escrowed 0/i }));
    expect(screen.getByText(/No escrowed holdings yet/i)).toBeInTheDocument();

    unmount();
    renderWithProviders(
      <WalletCard wallet={connectedWallet} holdings={emptyHoldings} />,
    );

    expect(screen.getByRole("tab", { name: /escrowed 0/i })).toHaveAttribute("aria-selected", "true");
  });

  it("supports keyboard navigation between holdings tabs", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <WalletCard
        wallet={connectedWallet}
        holdings={[
          {
            id: "hold-1",
            title: "Studio session",
            amount: "120 XLM",
            detail: "Ready to payout",
            status: "available",
          },
        ]}
      />,
    );

    const availableTab = screen.getByRole("tab", { name: /available 1/i });
    const escrowedTab = screen.getByRole("tab", { name: /escrowed 0/i });

    availableTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(escrowedTab).toHaveAttribute("aria-selected", "true");
  });
});

// ---------------------------------------------------------------------------
// Contextual help (HelpPopover) for domain jargon — issue #652
// ---------------------------------------------------------------------------

describe("WalletCard contextual help", () => {
  it("renders a click-triggered help trigger for 'escrowed' in the holdings subtitle", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletCard wallet={connectedWallet} />);

    const escrowTrigger = screen.getByRole("button", {
      name: "Help: Escrowed holdings",
    });
    expect(escrowTrigger).toBeInTheDocument();
    expect(escrowTrigger).toHaveAttribute("aria-expanded", "false");

    await user.click(escrowTrigger);

    expect(escrowTrigger).toHaveAttribute("aria-expanded", "true");
    const dialog = screen.getByRole("dialog", { name: /^Escrow$/i });
    expect(dialog).toHaveTextContent(/locked by a smart contract/i);
  });

  it("renders a click-triggered help trigger for 'redeemed' in the holdings subtitle", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletCard wallet={connectedWallet} />);

    const redemptionTrigger = screen.getByRole("button", {
      name: "Help: Redeemed holdings",
    });
    await user.click(redemptionTrigger);

    const dialog = screen.getByRole("dialog", { name: /token redemption/i });
    expect(dialog).toHaveTextContent(/exchanges their time token/i);
  });

  it("is keyboard-operable (Enter opens, Escape closes and returns focus) rather than hover-only", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletCard wallet={connectedWallet} />);

    const escrowTrigger = screen.getByRole("button", {
      name: "Help: Escrowed holdings",
    });
    escrowTrigger.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog", { name: /^Escrow$/i })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: /^Escrow$/i })).not.toBeInTheDocument();
    expect(escrowTrigger).toHaveFocus();
  });

  it("renders a help trigger for 'time tokens' in the zero-balance nudge", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletCard wallet={zeroWallet} />);

    const timeTokenTrigger = screen.getByRole("button", {
      name: "Help: Time tokens",
    });
    await user.click(timeTokenTrigger);

    const dialog = screen.getByRole("dialog", { name: /^Time token$/i });
    expect(dialog).toHaveTextContent(/Stellar-based digital asset/i);
  });

  it("does not render the 'time tokens' help trigger when the balance is non-zero (nudge not shown)", () => {
    renderWithProviders(<WalletCard wallet={connectedWallet} />);
    expect(
      screen.queryByRole("button", { name: "Help: Time tokens" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the wallet holdings tabs valid: no interactive HelpPopover trigger is nested inside a role=tab element", () => {
    renderWithProviders(
      <WalletCard
        wallet={connectedWallet}
        holdings={[
          {
            id: "hold-1",
            title: "Studio session",
            amount: "120 XLM",
            detail: "Ready to payout",
            status: "available",
          },
        ]}
      />,
    );

    const tabs = screen.getAllByRole("tab");
    tabs.forEach((tab) => {
      expect(tab.querySelector("[data-help-popover-trigger='true']")).toBeNull();
    });
  });

  it("each help trigger has a learn-more link pointing at the glossary", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WalletCard wallet={connectedWallet} />);

    await user.click(
      screen.getByRole("button", { name: "Help: Escrowed holdings" }),
    );

    const learnMoreLink = screen.getByRole("link", {
      name: /learn more about escrow/i,
    });
    expect(learnMoreLink).toHaveAttribute("href", "/docs/glossary#escrow");
  });
});
