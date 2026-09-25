"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { clsx } from "clsx";
import { Menu, X, Shield, Keyboard, Settings, Search } from "lucide-react";
import { useRole } from "@/app/components/navigation/RoleContext";
import { RoleOnboardingDialog } from "@/app/components/navigation/role-onboarding-dialog";
import { getNavForRole, ROLE_META, type NavItem } from "@/app/components/navigation/role-nav";
import { HeaderSearch } from "@/app/components/header-search";
import { KeyboardShortcutsOverlay } from "@/app/components/keyboard-shortcuts-overlay";
import { AccountSwitcher } from "@/app/components/account-switcher";
import { ThemeSwitcher } from "@/app/components/ui/theme-switcher";
import { RoleChip } from "@/app/components/ui/RoleChip";
import { OfflineQueueIndicator } from "@/app/components/offline-queue-indicator";
import { ContextualKeysPanel } from "@/app/components/ui/contextual-keys-panel";
import { CommandPalette } from "@/app/components/command-palette";

function getOnlineStatus() {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

function SystemStatus() {
  const isOnline = useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    getOnlineStatus,
    () => true,
  );
  const statusId = useId();

  return (
    <div
      className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium md:inline-flex"
      style={{
        borderColor: "var(--shell-rail-border)",
        color: "var(--shell-text-muted)",
      }}
    >
      <span
        className={clsx(
          "h-2 w-2 rounded-full",
          isOnline ? "bg-emerald-400" : "bg-rose-400"
        )}
        aria-hidden="true"
      />
      <span>
        {isOnline ? "All Systems Nominal" : "Offline"}
      </span>
      <span id={statusId} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isOnline ? "System online" : "System offline"}
      </span>
    </div>
  );
}

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <Link
      href={item.href}
      aria-label={item.ariaLabel ?? item.label}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2",
        "focus-visible:ring-offset-slate-950",
        isActive
          ? "bg-white/10 text-white"
          : "hover:bg-white/6 text-slate-400 hover:text-slate-200"
      )}
      style={{
        backgroundColor: isActive ? "var(--shell-rail-active)" : undefined,
        color: isActive ? "var(--shell-rail-text-active)" : undefined,
      }}
    >
      <span aria-hidden="true" className="text-lg leading-none w-6 text-center shrink-0">
        {item.icon}
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function BottomNav({ items, pathname }: { items: NavItem[]; pathname: string }) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t sm:hidden"
      style={{
        background: "var(--shell-header-bg)",
        borderColor: "var(--shell-header-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex h-16 items-stretch">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.ariaLabel ?? item.label}
              aria-current={isActive ? "page" : undefined}
              className={clsx(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-inset",
                isActive
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200"
              )}
              style={isActive ? { color: "var(--shell-rail-text-active)" } : undefined}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "flex h-8 w-12 items-center justify-center rounded-full text-lg leading-none transition-colors",
                  isActive && "bg-white/10"
                )}
                style={isActive ? { backgroundColor: "var(--shell-rail-active)" } : undefined}
              >
                {item.icon}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
              <span
                aria-hidden="true"
                className={clsx(
                  "absolute top-0 h-0.5 w-8 rounded-full transition-colors",
                  isActive ? "bg-cyan-400" : "bg-transparent"
                )}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role } = useRole();
  const [isRailOpen, setIsRailOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const railToggleRef = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const liveId = useId();

  const navItems = getNavForRole(role);
  const roleMeta = ROLE_META[role];

  useEffect(() => {
    if (!isRailOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsRailOpen(false);
        railToggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isRailOpen]);

  useEffect(() => {
    if (!isRailOpen || !railRef.current) return;
    const focusable = railRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleTab);
    requestAnimationFrame(() => first?.focus());
    return () => document.removeEventListener("keydown", handleTab);
  }, [isRailOpen]);

  const closeRail = useCallback(() => {
    setIsRailOpen(false);
    railToggleRef.current?.focus();
  }, []);

  // ── Global shortcut: Ctrl/Cmd+/ opens the keyboard shortcuts overlay ──────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const handleRoleChange = (event: Event) => {
      const detail = (event as CustomEvent<{ role?: string }>).detail;
      if (!detail?.role) return;
      const nextMeta = ROLE_META[detail.role as keyof typeof ROLE_META];
      if (!nextMeta) return;
      setLiveAnnouncement(`Role changed to ${nextMeta.label}`);
    };

    window.addEventListener("chronopay:rolechange", handleRoleChange as EventListener);
    return () => {
      window.removeEventListener(
        "chronopay:rolechange",
        handleRoleChange as EventListener,
      );
    };
  }, []);

  return (
    <div className="app-shell flex min-h-screen flex-col">
      <div id={liveId} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* ── Command Bar ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          background: "var(--shell-header-bg)",
          borderColor: "var(--shell-header-border)",
        }}
      >
        <div className="mx-auto flex h-14 w-full items-center gap-2 px-4 sm:px-6">
          {/* Hamburger — visible only on small screens */}
          <button
            ref={railToggleRef}
            type="button"
            aria-label={isRailOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isRailOpen}
            aria-controls="admin-rail"
            onClick={() => setIsRailOpen((v) => !v)}
            className={clsx(
              "rounded-lg p-2 transition-colors lg:hidden",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
              "hover:bg-white/6 text-slate-400 hover:text-white"
            )}
          >
            {isRailOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight"
            style={{ color: "var(--shell-text)" }}
            aria-label="ChronoPay home"
          >
            <Shield className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            <span className="hidden sm:inline">ChronoPay</span>
          </Link>

          {/* Desktop nav links inline in command bar — visible only on large screens */}
          <nav aria-label="Quick navigation" className="hidden lg:flex lg:items-center lg:gap-1">
            {navItems.slice(0, 3).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.ariaLabel ?? item.label}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                    isActive
                      ? "text-white"
                      : "hover:bg-white/6 text-slate-400 hover:text-slate-200"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Global actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <RoleChip />
              <AccountSwitcher />
              <HeaderSearch />
              <button
                type="button"
                aria-label="Open command palette"
                title="Command palette (Ctrl+K / ⌘K)"
                onClick={() => {
                  document.dispatchEvent(new KeyboardEvent("keydown", {
                    key: "k",
                    metaKey: true,
                    bubbles: true,
                    cancelable: true,
                  }));
                }}
                className={clsx(
                  "hidden items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:flex",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2",
                  "focus-visible:ring-offset-slate-950",
                  "hover:bg-white/6 border-white/10 text-slate-400 hover:text-white"
                )}
              >
                <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Search…</span>
                <kbd className="ml-1 hidden rounded border border-white/10 bg-white/5 px-1 py-0.5 font-mono text-[10px] leading-none text-slate-500 sm:inline">
                  ⌘K
                </kbd>
              </button>
              <ThemeSwitcher />
              <OfflineQueueIndicator />
              <button
                type="button"
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts (Ctrl+/)"
                onClick={() => setIsShortcutsOpen(true)}
                className={clsx(
                  "rounded-full p-2 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2",
                  "focus-visible:ring-offset-slate-950",
                  "hover:bg-white/6 text-slate-400 hover:text-white"
                )}
              >
                <Keyboard className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <Link
              href="/dashboard/settings"
              aria-label="Settings"
              aria-current={pathname.startsWith("/dashboard/settings") ? "page" : undefined}
              title="Settings"
              className={clsx(
                "rounded-full p-2 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2",
                "focus-visible:ring-offset-slate-950",
                "hover:bg-white/6 text-slate-400 hover:text-white"
              )}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Link>

            {/* System Status — visible on medium+ screens */}
            <SystemStatus />
          </div>
        </div>
      </header>

      {/* ── Body: Rail + Content ─────────────────────────────────────────── */}
      <div className="flex flex-1">
        {/* ── Left Rail (Desktop persistent, Mobile overlay) ─────────────── */}
        <aside
          id="admin-rail"
          ref={railRef}
          role="navigation"
          aria-label="Module navigation"
          className={clsx(
            "flex flex-col border-e shrink-0 overflow-y-auto",
            "transition-transform duration-200 ease-out motion-reduce:transition-none",
            "lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-[var(--shell-rail-width)]",
            "fixed inset-y-0 inset-inline-start-0 z-40 w-64",
            "lg:translate-x-0",
            isRailOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
          )}
          style={{
            background: "var(--shell-rail-bg)",
            borderColor: "var(--shell-rail-border)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 lg:hidden">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--shell-text-muted)" }}>
              Modules
            </span>
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={closeRail}
              className={clsx(
                "rounded-lg p-1.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                "hover:bg-white/6 text-slate-400 hover:text-white"
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Role indicator */}
          <div
            className="mx-3 mb-3 rounded-xl border p-3 lg:mt-3"
            style={{
              borderColor: "var(--shell-rail-border)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="text-lg leading-none">{roleMeta.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--shell-rail-text-active)" }}>
                  {roleMeta.label}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--shell-text-muted)" }}>
                  {roleMeta.description}
                </p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav aria-label="Role modules" className="flex flex-col gap-1 px-3 pb-4">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onClick={closeRail} />
            ))}
          </nav>

          {/* Mobile backdrop */}
          {isRailOpen && (
            <button
              aria-label="Close navigation menu"
              tabIndex={-1}
              onClick={closeRail}
              className="fixed inset-0 z-[-1] bg-black/40 backdrop-blur-sm lg:hidden"
            />
          )}
        </aside>

        {/* ── Main Content ──────────────────────────────────────────────── */}
        <main
          id="main-content"
          className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8"
          style={{
            marginInlineStart: 0,
          }}
        >
          <ContextualKeysPanel />
          {children}
          {navItems.length > 0 && (
            <div
              aria-hidden="true"
              className="sm:hidden"
              style={{ height: "calc(env(safe-area-inset-bottom) + 4rem)" }}
            />
          )}
        </main>
      </div>

      <BottomNav items={navItems} pathname={pathname} />

      {/* ── Keyboard shortcuts overlay ─────────────────────────────────────── */}
      <KeyboardShortcutsOverlay
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <RoleOnboardingDialog />
      {/* ── Command Palette — global Cmd+K / Ctrl+K navigation ────────────── */}
      <CommandPalette />
    </div>
  );
}
