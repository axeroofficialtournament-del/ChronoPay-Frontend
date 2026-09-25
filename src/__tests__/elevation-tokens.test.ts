import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("elevation token system", () => {
  const css = read("src/app/globals.css");

  it("defines and exposes all five elevation levels", () => {
    for (let level = 1; level <= 5; level += 1) {
      expect(css).toContain(`--elevation-${level}:`);
      expect(css).toContain(`.elevation-${level}`);
      expect(css).toContain(`var(--elevation-${level})`);
    }
  });

  it("uses colored ambient light in the dark-mode scale", () => {
    const darkTheme = css.slice(css.indexOf(":root"), css.indexOf('[data-theme="light"]'));

    expect(darkTheme).toMatch(/--elevation-1:[^;]+rgba\(34, 211, 238/);
    expect(darkTheme).toMatch(/--elevation-5:[^;]+rgba\(99, 102, 241/);
  });

  it("applies the scale to cards, popovers, tooltips, and modals", () => {
    expect(css).toMatch(/\.card\s*\{[^}]*var\(--elevation-1\)/);
    expect(read("src/app/components/ui/help-popover.tsx")).toContain("elevation-3");
    expect(read("src/app/components/ui/tooltip.tsx")).toContain("elevation-2");
    expect(read("src/components/receipt/ReceiptModal.tsx")).toContain("elevation-4");
    expect(read("src/components/dashboard/WalletConnectModal.tsx")).toContain("elevation-4");
  });

  it("documents accessibility and nested overlay guidance", () => {
    const guide = read("docs/elevation-tokens.md");

    expect(guide).toContain("WCAG 2.1 AA");
    expect(guide).toContain("nested overlays");
  });
});
