import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SupplierProfileHero } from "./supplier-profile-hero";

const defaultProps = {
  name: "Alice Chen",
  title: "Professional Photographer",
  yearsActive: 5,
  responseTime: "<15 min",
  isVerified: true,
};

describe("SupplierProfileHero", () => {
  it("renders name, title, and credential chips", () => {
    render(<SupplierProfileHero {...defaultProps} />);
    expect(screen.getByText("Alice Chen")).toBeInTheDocument();
    expect(screen.getByText("Professional Photographer")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText("5 years active")).toBeInTheDocument();
    expect(screen.getByText("Response: <15 min")).toBeInTheDocument();
  });

  it("renders fallback avatar initial when no avatar provided", () => {
    render(<SupplierProfileHero {...defaultProps} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("renders custom avatar when provided", () => {
    render(
      <SupplierProfileHero {...defaultProps} avatar="/avatars/alice.jpg" />,
    );
    const img = screen.getByAltText("Alice Chen avatar");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/avatars/alice.jpg");
  });

  it("renders cover image when provided", () => {
    render(
      <SupplierProfileHero {...defaultProps} coverImage="/covers/banner.jpg" />,
    );
    const img = screen.getByRole("presentation");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/covers/banner.jpg");
  });

  it("renders fallback gradient when no cover image", () => {
    const { container } = render(<SupplierProfileHero {...defaultProps} />);
    const gradientDiv = container.querySelector(
      ".bg-gradient-to-br",
    );
    expect(gradientDiv).toBeInTheDocument();
  });

  it("hides verified chip when isVerified is false", () => {
    render(
      <SupplierProfileHero {...defaultProps} isVerified={false} />,
    );
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  it("shows singular 'year' for yearsActive = 1", () => {
    render(
      <SupplierProfileHero {...defaultProps} yearsActive={1} />,
    );
    expect(screen.getByText("1 year active")).toBeInTheDocument();
  });

  it("shows plural 'years' for yearsActive > 1", () => {
    render(
      <SupplierProfileHero {...defaultProps} yearsActive={3} />,
    );
    expect(screen.getByText("3 years active")).toBeInTheDocument();
  });

  it("renders additional badgeLabels", () => {
    render(
      <SupplierProfileHero
        {...defaultProps}
        badgeLabels={["Top Rated", "Fast Shipper"]}
      />,
    );
    expect(screen.getByText("Top Rated")).toBeInTheDocument();
    expect(screen.getByText("Fast Shipper")).toBeInTheDocument();
  });

  it("calls onShare when share button is clicked", async () => {
    const onShare = vi.fn();
    render(
      <SupplierProfileHero {...defaultProps} onShare={onShare} />,
    );
    const shareBtn = screen.getByLabelText("Share Alice Chen profile");
    await userEvent.click(shareBtn);
    expect(onShare).toHaveBeenCalledOnce();
  });

  it("toggles follow state on button click", async () => {
    render(<SupplierProfileHero {...defaultProps} />);
    const followBtn = screen.getByRole("button", {
      name: /follow/i,
    });
    expect(followBtn).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(followBtn);
    expect(followBtn).toHaveAttribute("aria-pressed", "true");
    expect(followBtn).toHaveTextContent("Following");
  });

  it("calls onFollowToggle with new state", async () => {
    const onFollowToggle = vi.fn();
    render(
      <SupplierProfileHero
        {...defaultProps}
        onFollowToggle={onFollowToggle}
      />,
    );
    const followBtn = screen.getByRole("button", {
      name: /follow/i,
    });
    await userEvent.click(followBtn);
    expect(onFollowToggle).toHaveBeenCalledWith(true);
  });

  it("shows initial following state", () => {
    render(
      <SupplierProfileHero {...defaultProps} initialFollowing={true} />,
    );
    const followBtn = screen.getByRole("button", {
      name: /following/i,
    });
    expect(followBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("disables follow button while busy", async () => {
    let resolvePromise: () => void = () => {};
    const onFollowToggle = vi.fn<
      (following: boolean) => void | Promise<void>
    >(
      () =>
        new Promise<void>((resolve) => {
          resolvePromise = () => resolve();
        }),
    );
    render(
      <SupplierProfileHero
        {...defaultProps}
        onFollowToggle={onFollowToggle}
      />,
    );
    const followBtn = screen.getByRole("button", {
      name: /follow/i,
    });
    await userEvent.click(followBtn);
    expect(followBtn).toBeDisabled();
    resolvePromise();
  });

  it("truncates long name and title", () => {
    const longName = "A very long supplier name that should be truncated".repeat(3);
    const longTitle = "A very long professional title that spans many words".repeat(3);
    const { container } = render(
      <SupplierProfileHero
        {...defaultProps}
        name={longName}
        title={longTitle}
      />,
    );
    const nameEl = container.querySelector("h1");
    expect(nameEl).toHaveClass("truncate");
    const titleEl = container.querySelector("p");
    expect(titleEl).toHaveClass("truncate");
  });

  it("renders with dir=auto for RTL support", () => {
    const { container } = render(<SupplierProfileHero {...defaultProps} />);
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("dir", "auto");
  });

  it("has accessible live region for announcements", () => {
    const { container } = render(<SupplierProfileHero {...defaultProps} />);
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it("renders credentials list with role=list", () => {
    const { container } = render(<SupplierProfileHero {...defaultProps} />);
    const list = container.querySelector('[role="list"]');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute("aria-label", "Supplier credentials");
  });

  it("renders each credential chip with role=listitem", () => {
    render(
      <SupplierProfileHero
        {...defaultProps}
        badgeLabels={["Extra Badge"]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("applies custom className", () => {
    const { container } = render(
      <SupplierProfileHero {...defaultProps} className="custom-class" />,
    );
    const section = container.querySelector("section");
    expect(section).toHaveClass("custom-class");
  });

  it("renders share button with correct aria-label", () => {
    render(
      <SupplierProfileHero {...defaultProps} />,
    );
    expect(
      screen.getByLabelText("Share Alice Chen profile"),
    ).toBeInTheDocument();
  });
});
