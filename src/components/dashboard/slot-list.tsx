"use client";

/**
 * SlotList
 *
 * Supplier availability list with:
 *  - a timezone ribbon, plus a "Rebook a matching slot" carousel when
 *    suggested alternatives are provided (arrow-key navigable),
 *  - draggable slot cards that support mouse drag-and-drop reordering, a
 *    keyboard "nudge" with Alt+Arrow keys, and a multi-step selection gesture
 *    (Enter / Space toggle, Shift for ranges, Meta/Ctrl to add),
 *  - a rebooking flow for cancelled / rescheduled time-tokens that opens the
 *    RebookingDialog with nearest-equivalent slots from the same supplier.
 *
 * Accessibility (WCAG 2.1 AA):
 *  - List rows expose stable aria-labels and toggle state via aria-pressed.
 *  - All state changes are announced through a polite live region (selection,
 *    reorder, nudge, conflicts during drag).
 *  - Drag count / conflict state is also available to keyboard users via the
 *    same live region once a drag starts.
 *  - Interactive elements follow the project's focus-ring-cyan pattern.
 */

import { useCallback, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import { StatusChip } from "./status-chip";
import { HelpPopover } from "@/app/components/ui/help-popover";
import { TimezoneRibbon } from "./timezone-ribbon";
import { KeepOriginalPriceChip } from "./keep-original-price-chip";
import { RebookingDialog } from "./rebooking-dialog";
import { glossary } from "@/lib/glossary";
import type { Slot } from "./types";
import type { AlternativeSlot, RebookingChoice } from "./rebooking-utils";
import { useDensity, type Density } from "@/hooks/use-density";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CalendarView } from "./calendar-view";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { AlternativeSlot } from "./rebooking-utils";

export type RebookingDetail = { alternativeId?: string };

interface SlotListProps {
  slots?: Slot[];
  supplierId?: string;
  supplierTimeZone?: string;
  supplierName?: string;
  /**
   * Alternative slots offered to the buyer during a rebooking flow. When
   * provided (even as an empty array) the "Rebook a matching slot" section is
   * rendered. Pass `undefined` to hide the section entirely.
   */
  suggestedAlternatives?: AlternativeSlot[];
  /**
   * Original booking price in XLM — used by the KeepOriginalPriceChip to
   * compute whether a price-preservation credit offer should appear.
   */
  originalPriceXlm?: number;
  /**
   * Buyer's available account credit in XLM. Passed through to the chips.
   */
  availableCreditXlm?: number;
  /**
   * Called when the buyer applies a price-preservation credit on an
   * alternative slot. Receives the slot id and price difference covered.
   */
  onApplyCredit?: (slotId: string, priceDiff: number) => void;
  /**
   * Called when a cancelled / rescheduled time-token is rebooked through the
   * dialog. May be async; if it rejects the dialog surfaces an inline error
   * with a retry action.
   */
  onRebookConfirm?: (
    choice: RebookingChoice,
    detail: RebookingDetail,
  ) => Promise<void> | void;
}

// ─── Local default data ────────────────────────────────────────────────────────

const localDefaultSlots: Slot[] = [
  {
    id: "slot-0",
    title: "Founder office hours",
    dateLabel: "Today",
    timeRange: "09:00 - 09:30 UTC",
    status: "Healthy",
    demand: "High Demand",
    rate: "120 XLM / hr",
    durationMinutes: 30,
    isNextAvailable: true,
  },
  {
    id: "slot-1",
    title: "1-on-1 Architecture Consultation",
    dateLabel: "Today",
    timeRange: "14:00 - 15:00 UTC",
    status: "Healthy",
    demand: "High Demand",
    rate: "50 XLM / hr",
    durationMinutes: 60,
    isNextAvailable: false,
  },
  {
    id: "slot-2",
    title: "Code Review & Optimization",
    dateLabel: "Tomorrow",
    timeRange: "10:00 - 11:30 UTC",
    status: "Tight",
    demand: "Medium Demand",
    rate: "75 XLM / hr",
    durationMinutes: 45,
    isNextAvailable: false,
  },
  {
    id: "slot-3",
    title: "Quick 15-minute intro",
    dateLabel: "Tomorrow",
    timeRange: "13:00 - 13:15 UTC",
    status: "Healthy",
    demand: "Low Demand",
    rate: "20 XLM / hr",
    durationMinutes: 15,
    isNextAvailable: false,
  },
  {
    id: "slot-4",
    title: "Pair Programming Session",
    dateLabel: "Fri, Aug 14",
    timeRange: "16:00 - 17:30 UTC",
    status: "Busy",
    demand: "High Demand",
    rate: "85 XLM / hr",
    durationMinutes: 90,
    isNextAvailable: false,
    lifecycleStatus: "rescheduled",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRebookable(slot: Slot): boolean {
  return (
    slot.lifecycleStatus === "cancelled" ||
    slot.lifecycleStatus === "rescheduled"
  );
}

function toneForStatus(status: string) {
  const s = status.toLowerCase();
  if (s === "healthy" || s === "available") return "positive";
  if (s === "tight" || s === "busy") return "warning";
  return "neutral";
}

type DropPosition = "before" | "after";

type ViewMode = "list" | "month" | "week" | "day";

// ─── SuggestedAlternativesCarousel ────────────────────────────────────────────

/**
 * Internal carousel that renders the suggested alternative slots during
 * a rebooking flow. Supports arrow-key navigation between cards and surfaces
 * the KeepOriginalPriceChip when there is a price difference.
 */
function SuggestedAlternativesCarousel({
  alternatives,
  originalPriceXlm,
  availableCreditXlm = 0,
  onApplyCredit,
}: {
  alternatives: AlternativeSlot[];
  originalPriceXlm?: number;
  availableCreditXlm?: number;
  onApplyCredit?: (slotId: string, priceDiff: number) => void;
}) {
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleCardKeyDown = (
    e: KeyboardEvent<HTMLDivElement>,
    index: number,
  ) => {
    const count = alternatives.length;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (index + 1) % count;
      cardRefs.current[next]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (index - 1 + count) % count;
      cardRefs.current[prev]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      cardRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      cardRefs.current[count - 1]?.focus();
    }
  };

  if (alternatives.length === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-white/8 bg-white/[0.02] px-5 py-6 text-center"
      >
        <p className="text-sm font-medium text-slate-300">No alternatives</p>
        <p className="mt-1 text-xs text-slate-500">
          No matching alternatives found for your original booking criteria.
        </p>
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="Suggested alternative slots"
      className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3"
    >
      {alternatives.map((alt, index) => {
        const cardLabel = `Alternative slot: ${alt.title}, ${alt.dateLabel} ${alt.timeRange}`;
        const showPriceChip =
          originalPriceXlm !== undefined &&
          alt.priceXlm !== undefined &&
          alt.priceXlm > originalPriceXlm;

        return (
          <div
            key={alt.id}
            role="listitem"
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            tabIndex={0}
            aria-label={cardLabel}
            onKeyDown={(e) => handleCardKeyDown(e, index)}
            className={clsx(
              "flex min-w-[260px] flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:min-w-0",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
              "transition-colors hover:border-cyan-300/20 hover:bg-white/[0.05]",
            )}
          >
            {/* Card header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {alt.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {alt.dateLabel} · {alt.timeRange}
                </p>
              </div>
              <StatusChip tone={toneForStatus(alt.status)} className="shrink-0">
                {alt.status}
              </StatusChip>
            </div>

            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1">
                {alt.demand}
              </span>
              <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 font-mono tabular-nums">
                {alt.rate}
              </span>
            </div>

            {/* Price nudge chip — only when alternative is more expensive */}
            {showPriceChip && (
              <KeepOriginalPriceChip
                originalPrice={originalPriceXlm as number}
                alternativePrice={alt.priceXlm as number}
                availableCredit={availableCreditXlm}
                onApplyCredit={(diff) => onApplyCredit?.(alt.id, diff)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SlotList ─────────────────────────────────────────────────────────────────

// ─── DensityToggle ────────────────────────────────────────────────────────────

const DENSITY_MODES: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "balanced", label: "Balanced" },
  { value: "compact", label: "Compact" },
];

/**
 * Density control for the slot list. It writes through to the shared
 * `chronopay-density` store, so choosing a mode here also applies to every
 * other data-dense surface rather than creating a second preference.
 */
function DensityToggle({
  density,
  onChange,
}: {
  density: Density;
  onChange: (density: Density) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Density"
      className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1"
    >
      {DENSITY_MODES.map((option) => {
        const active = density === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={`${option.label} density`}
            aria-pressed={active}
            title={`${option.label} density`}
            onClick={() => onChange(option.value)}
            className={clsx(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors motion-reduce:transition-none",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
              active
                ? "bg-white/10 text-white shadow-sm"
                : "text-slate-400 hover:bg-white/5 hover:text-white",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export const SlotList = ({
  slots = localDefaultSlots,
  supplierId = "supplier-001",
  supplierTimeZone = "America/New_York",
  supplierName = "Alex",
  suggestedAlternatives,
  originalPriceXlm,
  availableCreditXlm = 0,
  onApplyCredit,
  onRebookConfirm,
}: SlotListProps) => {
  const [activeTz, setActiveTz] = useState<string>("UTC");
  const { density, setDensity } = useDensity();

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // The URL is the initial source of truth for the view, but the toggle also
  // updates local state so the view switches immediately even when the router
  // is a no-op (server-rendered hosts, mocked router in tests, etc.).
  const viewParam = searchParams.get("view");
  const [viewMode, setViewModeState] = useState<ViewMode>(() =>
    viewParam === "month" || viewParam === "week" || viewParam === "day"
      ? viewParam
      : "list",
  );

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", mode);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Optional `?duration=` filter (minutes). Absent / non-numeric means "all".
  const durationParam = searchParams.get("duration");
  const durationFilter =
    durationParam === null || durationParam.trim() === ""
      ? undefined
      : Number(durationParam);
  const activeDurationFilter =
    durationFilter !== undefined && Number.isFinite(durationFilter)
      ? durationFilter
      : undefined;

  const [orderedSlots, setOrderedSlots] = useState<Slot[]>(() =>
    activeDurationFilter === undefined
      ? slots
      : slots.filter((slot) => slot.durationMinutes === activeDurationFilter),
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: DropPosition;
  } | null>(null);
  const [conflicts, setConflicts] = useState<Record<string, string>>({});
  const [activeRebook, setActiveRebook] = useState<Slot | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const liveMessageTimer = useRef<number | null>(null);
  const lastSelectedId = useRef<string | null>(null);

  const announce = useCallback((message: string) => {
    if (liveMessageTimer.current !== null) {
      window.clearTimeout(liveMessageTimer.current);
    }
    setLiveMessage(message);
    liveMessageTimer.current = window.setTimeout(
      () => setLiveMessage(""),
      3000,
    );
  }, []);

  // ── Selection (multi-select with range / additive modifiers) ───────────────
  const toggleSelection = useCallback(
    (id: string, e?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => {
      const shift = e?.shiftKey ?? false;
      const meta = e?.metaKey ?? false;
      const ctrl = e?.ctrlKey ?? false;

      const next = new Set(selectedIds);
      if (shift && lastSelectedId.current) {
        const currentIndex = orderedSlots.findIndex((s) => s.id === id);
        const lastIndex = orderedSlots.findIndex(
          (s) => s.id === lastSelectedId.current,
        );
        if (currentIndex >= 0 && lastIndex >= 0) {
          if (!meta && !ctrl) next.clear();
          const start = Math.min(currentIndex, lastIndex);
          const end = Math.max(currentIndex, lastIndex);
          for (let i = start; i <= end; i++) {
            next.add(orderedSlots[i].id);
          }
        }
      } else if (meta || ctrl) {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      } else {
        if (next.has(id) && next.size === 1) next.delete(id);
        else {
          next.clear();
          next.add(id);
        }
      }

      setSelectedIds(next);
      lastSelectedId.current = id;
      announce(`${next.size} slot${next.size !== 1 ? "s" : ""} selected.`);
    },
    [announce, orderedSlots, selectedIds],
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedId.current = null;
    announce("Selection cleared.");
  }, [announce]);

  const handleRowKeyDown = useCallback(
    (slot: Slot, e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleSelection(slot.id, e);
        return;
      }
      if (e.key === "Escape" && selectedIds.size > 0) {
        e.preventDefault();
        clearSelection();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const index = orderedSlots.findIndex((s) => s.id === slot.id);
        const targetIndex = index + dir;
        if (index < 0 || targetIndex < 0 || targetIndex >= orderedSlots.length)
          return;
        const next = [...orderedSlots];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        setOrderedSlots(next);
        announce(
          `Moved ${slot.title} ${dir === 1 ? "down" : "up"} one position.`,
        );
      }
    },
    [announce, clearSelection, orderedSlots, selectedIds.size, toggleSelection],
  );

  // ── Drag-and-drop reordering ───────────────────────────────────────────────
  const clearDragState = useCallback(() => {
    setIsDragging(false);
    setDraggingId(null);
    setDropTarget(null);
    setConflicts({});
  }, []);

  const computeConflicts = useCallback(() => {
    const found: Record<string, string> = {};
    orderedSlots.forEach((s) => {
      if (s.status.toLowerCase() === "booked") found[s.id] = "Existing booking";
      if ((s as Slot & { blocked?: boolean }).blocked)
        found[s.id] = "Blocked day";
    });
    return found;
  }, [orderedSlots]);

  const handleDragStart = useCallback(
    (slot: Slot, e: DragEvent<HTMLElement>) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", slot.id);
      setDraggingId(slot.id);
      setIsDragging(true);
      const found = computeConflicts();
      setConflicts(found);
      const count = Object.keys(found).length;
      announce(
        count > 0
          ? `${count} blocked target${count !== 1 ? "s" : ""}.`
          : "No conflicts for the current drag.",
      );
    },
    [announce, computeConflicts],
  );

  const handleDragOver = useCallback(
    (slot: Slot, e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      // When the layout engine reports no height (e.g. jsdom) we cannot
      // compute a midpoint, so default to "before".
      const rect = e.currentTarget.getBoundingClientRect();
      const mid = rect.height > 0 ? rect.top + rect.height / 2 : Infinity;
      const position: DropPosition = e.clientY < mid ? "before" : "after";
      setDropTarget({ id: slot.id, position });
      e.dataTransfer.dropEffect = "move";
    },
    [],
  );

  const reorder = useCallback(
    (sourceId: string, targetId: string, position: DropPosition) => {
      const sourceIndex = orderedSlots.findIndex((s) => s.id === sourceId);
      if (sourceIndex < 0) return;
      const moved = orderedSlots[sourceIndex];
      const next = orderedSlots.filter((s) => s.id !== sourceId);
      const targetIndex = next.findIndex((s) => s.id === targetId);
      // A missing target index (source dropped on itself) anchors to the end
      // of the list, which keeps the drop deterministic.
      const insertionPoint =
        position === "after" ? targetIndex + 1 : targetIndex;
      const targetTitle = orderedSlots.find((s) => s.id === targetId)?.title;
      next.splice(insertionPoint, 0, moved);
      setOrderedSlots(next);
      setSelectedIds(new Set());
      lastSelectedId.current = null;
      announce(
        position === "after" && targetTitle
          ? `Moved ${moved.title} after ${targetTitle}.`
          : `Moved ${moved.title} before ${targetTitle ?? "its drop position"}.`,
      );
    },
    [announce, orderedSlots],
  );

  const handleDrop = useCallback(
    (slot: Slot, e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      const sourceId =
        e.dataTransfer.getData("text/plain") || draggingId || null;
      if (sourceId) {
        const position =
          dropTarget?.id === slot.id ? dropTarget.position : "before";
        reorder(sourceId, slot.id, position);
      }
      clearDragState();
    },
    [clearDragState, draggingId, dropTarget, reorder],
  );

  // ── Rebooking flow ─────────────────────────────────────────────────────────
  const handleRebookConfirm = useCallback(
    async (choice: RebookingChoice, detail: RebookingDetail) => {
      await onRebookConfirm?.(choice, detail);
    },
    [onRebookConfirm],
  );

  return (
    <div className="slot-list space-y-4" data-density={density}>
      {/* Timezone Ribbon Header */}
      <TimezoneRibbon
        supplierId={supplierId}
        supplierTimeZone={supplierTimeZone}
        supplierName={supplierName}
        onTimezoneChange={() => {}}
      />

      {/* ── Suggested alternatives (rebooking flow) ─────────────────────── */}
      {suggestedAlternatives !== undefined && (
        <section aria-labelledby="rebook-heading" className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 id="rebook-heading" className="text-base font-semibold text-white">
              Rebook a matching slot
            </h2>
            <span className="text-xs text-slate-400">Suggested alternatives</span>
          </div>
          <SuggestedAlternativesCarousel
            alternatives={suggestedAlternatives}
            originalPriceXlm={originalPriceXlm}
            availableCreditXlm={availableCreditXlm}
            onApplyCredit={onApplyCredit}
          />
        </section>
      )}

      {/* ── View Toggle ───────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" role="group" aria-label="View mode">
         {(["list", "month", "week", "day"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            aria-pressed={viewMode === mode}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
              viewMode === mode
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
            }`}
          >
            {mode}
          </button>
        ))}
        </div>
        <DensityToggle density={density} onChange={setDensity} />
      </div>

      {/* ── Primary slot list ───────────────────────────────────────────── */}
      {orderedSlots.length === 0 ? (
        <div
          role="status"
          className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center"
        >
          <h2 className="text-base font-semibold text-white">
            No slots available
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
            There are currently no scheduled availability slots for this
            supplier.
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-500">
            Rebook a previously cancelled or rescheduled time-token from this
            supplier, or check back later for newly opened availability
            windows.
          </p>
        </div>
      ) : (
        <>
          {viewMode === "list" ? (
            <ul className="space-y-4">
            {orderedSlots.map((slot) => {
              const slotTitleId = `slot-${slot.id}-title`;
              const slotDetailsId = `slot-${slot.id}-details`;
              const isSelected = selectedIds.has(slot.id);
              const isBefore =
                dropTarget?.id === slot.id && dropTarget.position === "before";
              const isAfter =
                dropTarget?.id === slot.id && dropTarget.position === "after";

              return (
                <li
                  key={slot.id}
                  data-slot-id={slot.id}
                  draggable
                  tabIndex={0}
                  aria-label={`availability slot: ${slot.title}, ${slot.dateLabel} ${slot.timeRange}`}
                  aria-pressed={isSelected}
                  onDragStart={(e) => handleDragStart(slot, e)}
                  onDragOver={(e) => handleDragOver(slot, e)}
                  onDrop={(e) => handleDrop(slot, e)}
                  onDragEnd={clearDragState}
                  onKeyDown={(e) => handleRowKeyDown(slot, e)}
                  data-density={density}
                  className={clsx(
                    "relative transition-colors motion-reduce:transition-none",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                    density === "compact"
                      ? "space-y-1"
                      : density === "comfortable"
                        ? "space-y-3"
                        : "space-y-2",
                  )}
                  aria-describedby={
                    conflicts[slot.id] ? `conflict-${slot.id}` : undefined
                  }
                >
                  {isBefore ? (
                    <div className="h-1 rounded-full bg-cyan-400/80" />
                  ) : null}

                  <div
                    className={clsx(
                      "rounded-[1.5rem] border transition-colors motion-reduce:transition-none",
                      density === "compact"
                        ? "p-2.5 sm:p-3"
                        : density === "comfortable"
                          ? "p-5 sm:p-6"
                          : "p-4 sm:p-5",
                      isSelected
                        ? "border-cyan-400/40 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.03] hover:border-cyan-400/30 hover:bg-cyan-400/[0.06]",
                      isDragging && draggingId === slot.id &&
                        "border-cyan-400/80 bg-cyan-400/10 opacity-70",
                    )}
                  >
                    {conflicts[slot.id] ? (
                      <div className="absolute inset-0 z-10 rounded-[1.5rem] bg-red-400/10"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0 6px, transparent 6px 12px)",
                        }}
                        role="img"
                        aria-label={`Conflict: ${conflicts[slot.id]}`}
                      >
                        <span
                          id={`conflict-${slot.id}`}
                          className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-red-700/90 px-3 py-1.5 text-xs font-medium text-white"
                        >
                          {conflicts[slot.id]}
                        </span>
                      </div>
                    ) : null}

                    <article aria-labelledby={slotTitleId}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              id={slotTitleId}
                              className="text-lg font-semibold text-white"
                            >
                              {slot.title}
                            </h3>
                            {isDragging && draggingId === slot.id ? (
                              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
                                Moving
                              </span>
                            ) : null}
                          </div>
                          <p
                            className="text-sm text-slate-300"
                            id={slotDetailsId}
                          >
                            {slot.dateLabel}
                            <span aria-hidden="true"> · </span>
                            {slot.timeRange}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-300">
                            Drag to move
                          </span>
                          <StatusChip tone={toneForStatus(slot.status)}>
                            {slot.status}
                          </StatusChip>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-3 py-1.5">
                          {slot.rate}
                          <HelpPopover
                            term={glossary.rate}
                            triggerLabel="Help: slot rate and XLM pricing"
                          />
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          Rate details
                          <HelpPopover
                            term={glossary.xlm}
                            triggerLabel="Help: XLM and Stellar network fees"
                          />
                        </span>
                      </div>
                    </article>
                  </div>

                  {/* Rebooking trigger for cancelled / rescheduled tokens */}
                  {isRebookable(slot) ? (
                    <div className="flex flex-wrap items-center gap-2 pl-1">
                      <span className="text-xs text-slate-400">
                        This time-token was {slot.status.toLowerCase()}.
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveRebook(slot)}
                        aria-label={`Rebook ${slot.title}`}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:border-cyan-400/60 hover:bg-cyan-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        Rebook this time-token
                      </button>
                    </div>
                  ) : null}

                  {isAfter ? (
                    <div className="h-1 rounded-full bg-cyan-400/80" />
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <CalendarView slots={slots} viewMode={viewMode as "month" | "week" | "day"} />
        )}

        </>
      )}

      {/* Rebooking dialog — open for the active cancelled/rescheduled token */}
      <RebookingDialog
        open={activeRebook !== null}
        onClose={() => setActiveRebook(null)}
        tokenTitle={activeRebook?.title ?? ""}
        tokenDateLabel={activeRebook?.dateLabel ?? ""}
        tokenTimeRange={activeRebook?.timeRange ?? ""}
        originalPriceXlm={originalPriceXlm}
        alternatives={suggestedAlternatives}
        onConfirm={handleRebookConfirm}
      />

      {/* Live region for multi-select / reorder announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Slot list announcements"
        className="sr-only"
      >
        {liveMessage}
      </div>
    </div>
  );
};