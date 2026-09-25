"use client";

import { useCallback, useId, useState } from "react";
import { HelpPopover } from "@/app/components/ui/help-popover";
import { CopyButton } from "@/app/components/ui/copy-button";
import { glossary } from "@/lib/glossary";
import type { AutosaveStatus, BookingStage } from "./types";
import { AutosaveIndicator } from "./autosave-indicator";
import { LiveRegion } from "@/components/common/LiveRegion";
import { useToast } from "@/hooks/use-toast";
import { truncateHash } from "@/components/receipt/masking";
import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react";

export type BookingFlowValidationSummary = {
  title?: string;
  items?: string[];
};

export type BookingFlowStep = {
  id: string;
  title: string;
  description?: string;
  summary?: string[];
  validationSummary?: BookingFlowValidationSummary;
};

export type BookingFlowShellProps = {
  steps?: BookingFlowStep[];
  currentStep?: number;
  onBack?: (stepIndex: number) => void;
  onNext?: (stepIndex: number) => void;
  unsavedChanges?: boolean;
  ariaLabel?: string;
};

/**
 * Tone tokens mirror the `StatusChip` palette so the timeline reads
 * consistently across booking, escrow, refund, and dispute lifecycles.
 */
export type StatusTimelineTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export type StatusTimelineItemStatus = "complete" | "current" | "upcoming";

export type StatusTimelineItem = {
  /** Stable identifier used for keys, expansion state, and aria wiring. */
  id: string;
  title: string;
  /** Optional longer explanation revealed on expansion. */
  description?: string;
  /** Who performed / owns this step (buyer, seller, escrow agent, system). */
  actor?: string;
  /** When the step occurred. Accepts Date or ISO string; invalid values are ignored. */
  timestamp?: Date | string;
  tone?: StatusTimelineTone;
  status?: StatusTimelineItemStatus;
  /** Additional detail lines revealed on expansion. */
  details?: string[];
};

export type StatusTimelineProps = {
  items?: StatusTimelineItem[];
  ariaLabel?: string;
  isLoading?: boolean;
  error?: string | null;
  /** Optionally expand a step by id on first render. */
  defaultExpandedId?: string;
};

export function BookingProgress({
  stages,
  autosaveStatus,
  autosaveLastSavedAt,
  onAutosaveRetry,
}: {
  stages: BookingStage[];
  autosaveStatus?: AutosaveStatus;
  autosaveLastSavedAt?: Date;
  onAutosaveRetry?: () => void;
}) {
  const maxValue = Math.max(...stages.map((stage) => stage.value), 1);

  return (
    <div className="space-y-5">
      {/* Heading row — "Booking stages" label with lifecycle explanation */}
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Booking stages
        </p>
        <HelpPopover
          term={glossary.bookingStages}
          triggerLabel="Help: booking lifecycle stages"
        />
        {autosaveStatus ? (
          <AutosaveIndicator
            status={autosaveStatus}
            lastSavedAt={autosaveLastSavedAt}
            onRetry={onAutosaveRetry}
          />
        ) : null}
      </div>

      {stages.map((stage, index) => {
        const labelId = `booking-label-${index}`;
        const valueId = `booking-value-${index}`;
        return (
          <div
            key={`${stage.label}-${index}`}
            role="listitem"
            aria-labelledby={labelId}
            aria-describedby={valueId}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p id={labelId} className="text-sm font-medium text-white">
                {stage.label}
              </p>
              <p id={valueId} className="text-sm text-slate-300" aria-atomic="true">
                {stage.value} bookings
              </p>
            </div>
            <div className="h-2.5 rounded-full bg-white/10" aria-hidden={true}>
              <div
                className="h-2.5 rounded-full bg-[linear-gradient(90deg,#67e8f9,#22c55e)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                style={{ width: `${(stage.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STATUS_TIMELINE_TONES: Record<
  StatusTimelineTone,
  { dot: string; ring: string; text: string }
> = {
  neutral: {
    dot: "bg-slate-500",
    ring: "border-slate-700",
    text: "text-slate-200",
  },
  info: {
    dot: "bg-cyan-400",
    ring: "border-cyan-400/60",
    text: "text-cyan-100",
  },
  success: {
    dot: "bg-emerald-500",
    ring: "border-emerald-500/60",
    text: "text-emerald-100",
  },
  warning: {
    dot: "bg-amber-400",
    ring: "border-amber-400/60",
    text: "text-amber-100",
  },
  danger: {
    dot: "bg-rose-500",
    ring: "border-rose-500/60",
    text: "text-rose-100",
  },
};

/**
 * Safely format a timeline timestamp. Returns null for missing or invalid
 * values so callers can omit the `<time>` element entirely.
 */
export function formatTimelineTimestamp(value?: Date | string): string | null {
  if (value === undefined || value === null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Reusable vertical status timeline for booking / escrow / refund / dispute
 * lifecycles.
 *
 * Accessibility:
 * - Renders an ordered list (`<ol>`) to convey step order.
 * - Marks the active step with `aria-current="step"`.
 * - Per-step detail toggles expose `aria-expanded` / `aria-controls`.
 * - Loading and error states use `role="status"` / `role="alert"`.
 *
 * Invalid items (missing `id` or `title`) are filtered out defensively so a
 * malformed entry cannot break the list or duplicate React keys.
 */
export function StatusTimeline({
  items = [],
  ariaLabel = "Status timeline",
  isLoading = false,
  error = null,
  defaultExpandedId,
}: StatusTimelineProps) {
  const safeItems = items.filter(
    (item): item is StatusTimelineItem =>
      Boolean(item) && Boolean(item.id) && Boolean(item.title),
  );
  const seenIds = new Set<string>();
  const uniqueItems = safeItems.filter((item) => {
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  const [expandedId, setExpandedId] = useState<string | null>(
    defaultExpandedId ?? null,
  );

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100"
      >
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300"
      >
        Loading status timeline…
      </div>
    );
  }

  if (uniqueItems.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-300">
        No status updates available yet.
      </p>
    );
  }

  return (
    <ol
      aria-label={ariaLabel}
      className="relative space-y-4 border-l border-slate-700 pl-6"
    >
      {uniqueItems.map((item) => {
        const tone = STATUS_TIMELINE_TONES[item.tone ?? "neutral"];
        const isCurrent = item.status === "current";
        const isComplete = item.status === "complete";
        const hasDetails = Boolean(
          item.description || (item.details && item.details.length > 0),
        );
        const isExpanded = hasDetails && expandedId === item.id;
        const timestamp = formatTimelineTimestamp(item.timestamp);
        const panelId = `timeline-panel-${item.id}`;
        const toggleId = `timeline-toggle-${item.id}`;

        return (
          <li
            key={item.id}
            aria-current={isCurrent ? "step" : undefined}
            className="relative"
          >
            <span
              className={[
                "absolute -left-[1.65rem] top-1 flex h-3.5 w-3.5 rounded-full ring-4 ring-slate-950 transition-transform",
                tone.dot,
                isCurrent ? "scale-110" : "",
              ].join(" ")}
              aria-hidden="true"
            />
            <div
              className={[
                "rounded-xl border px-3 py-2 transition-colors",
                tone.ring,
                isCurrent ? "bg-white/5" : "bg-slate-950/40",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={["text-sm font-medium", tone.text].join(" ")}>
                    {item.title}
                    {isComplete ? (
                      <span className="ml-2 text-xs text-emerald-300">Done</span>
                    ) : null}
                  </p>
                  {(item.actor || timestamp) ? (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {item.actor ? <span>{item.actor}</span> : null}
                      {item.actor && timestamp ? (
                        <span aria-hidden="true"> · </span>
                      ) : null}
                      {timestamp ? <time>{timestamp}</time> : null}
                    </p>
                  ) : null}
                </div>
                {hasDetails ? (
                  <button
                    id={toggleId}
                    type="button"
                    onClick={() =>
                      setExpandedId((prev) =>
                        prev === item.id ? null : item.id,
                      )
                    }
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="shrink-0 rounded-md border border-slate-600 px-2 py-1 text-xs font-medium text-slate-200 transition hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    {isExpanded ? "Hide" : "Details"}
                  </button>
                ) : null}
              </div>

              {isExpanded ? (
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={toggleId}
                  className="mt-2 border-t border-slate-700 pt-2 text-sm text-slate-200"
                >
                  {item.description ? <p>{item.description}</p> : null}
                  {item.details && item.details.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {item.details.map((detail, i) => (
                        <li
                          key={`${item.id}-detail-${i}`}
                          className="flex items-start gap-2"
                        >
                          <span
                            className="mt-1.5 h-1 w-1 rounded-full bg-slate-400"
                            aria-hidden="true"
                          />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function BookingFlowShell({
  steps = [],
  currentStep = 0,
  onBack,
  onNext,
  unsavedChanges = false,
  ariaLabel = "Booking progress",
}: BookingFlowShellProps) {
  const safeSteps = steps.filter((step) => step && step.title);
  const boundedIndex =
    safeSteps.length === 0
      ? 0
      : Math.min(Math.max(currentStep, 0), safeSteps.length - 1);
  const activeStep = safeSteps[boundedIndex] ?? null;
  const isLastStep = safeSteps.length > 0 && boundedIndex === safeSteps.length - 1;

  const confirmNavigation = (direction: "back" | "next") => {
    if (!unsavedChanges) return true;
    if (typeof window === "undefined") return true;
    const shouldLeave = window.confirm(
      "You have unsaved changes. Are you sure you want to leave this step?",
    );
    if (!shouldLeave) return false;
    if (direction === "back" && onBack) {
      onBack(boundedIndex);
    }
    if (direction === "next" && onNext) {
      onNext(boundedIndex);
    }
    return true;
  };

  const handleBack = () => {
    if (unsavedChanges) {
      const shouldLeave = confirmNavigation("back");
      if (!shouldLeave) return;
      return;
    }
    if (onBack) {
      onBack(boundedIndex);
    }
  };

  const handleNext = () => {
    if (unsavedChanges) {
      const shouldLeave = confirmNavigation("next");
      if (!shouldLeave) return;
      return;
    }
    if (onNext) {
      onNext(boundedIndex);
    }
  };

  const announcement = activeStep
    ? `Step ${boundedIndex + 1} of ${safeSteps.length}: ${activeStep.title}`
    : "No booking steps available";

  const validationSummary = activeStep?.validationSummary ?? {
    title: "No issues to review",
    items: ["All required booking details are complete."],
  };

  return (
    <div className="space-y-5">
      <LiveRegion>{announcement}</LiveRegion>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <nav
          aria-label={ariaLabel}
          className="lg:sticky lg:top-6 self-start rounded-2xl border border-slate-200/10 bg-slate-900/70 p-4 shadow-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Booking progress
          </p>
          {safeSteps.length === 0 ? (
            <p className="mt-3 text-sm text-slate-300">No booking steps available.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {safeSteps.map((step, index) => {
                const isComplete = index < boundedIndex;
                const isCurrent = index === boundedIndex;

                return (
                  <li key={step.id ?? `${step.title}-${index}`}>
                    <div
                      className={[
                        "flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors motion-reduce:transition-none",
                        isCurrent
                          ? "border-cyan-400/80 bg-cyan-500/10 text-white"
                          : isComplete
                            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
                            : "border-slate-700 bg-slate-950/40 text-slate-300",
                      ].join(" ")}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <span
                        className={[
                          "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
                          isCurrent
                            ? "bg-cyan-400 text-slate-950"
                            : isComplete
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-slate-700 text-slate-200",
                        ].join(" ")}
                      >
                        {isComplete ? "✓" : index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{step.title}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </nav>

        <section className="rounded-2xl border border-slate-200/10 bg-slate-900/60 p-5 shadow-sm">
          {activeStep ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
                    Step {boundedIndex + 1} of {safeSteps.length}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    {activeStep.title}
                  </h3>
                </div>
                <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-100">
                  {isLastStep ? "Final" : "In progress"}
                </span>
              </div>

              {activeStep.description ? (
                <p className="mt-3 text-sm text-slate-300">{activeStep.description}</p>
              ) : null}

              <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Confirmed details
                </p>
                {activeStep.summary && activeStep.summary.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {activeStep.summary.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-300">No details have been confirmed yet.</p>
                )}
              </div>

              <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
                  {validationSummary.title ?? "Review required"}
                </p>
                {validationSummary.items && validationSummary.items.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm text-amber-50">
                    {validationSummary.items.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-300" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-amber-50">Looks good. No further validation needed.</p>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={boundedIndex === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3.5 py-2 text-sm font-medium text-slate-100 transition motion-reduce:transition-none hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Back"
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3.5 py-2 text-sm font-semibold text-slate-950 transition motion-reduce:transition-none hover:bg-cyan-300"
                  aria-label={isLastStep ? "Complete booking" : "Next"}
                >
                  {isLastStep ? "Complete" : "Next"}
                  {!isLastStep ? <ArrowRight size={16} aria-hidden="true" /> : null}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-300">
              No booking steps available.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── RefundTracker ────────────────────────────────────────────────────────────

/**
 * RefundTracker — multi-stage refund progress UI with ETA and a copyable
 * on-chain transaction hash.
 *
 * Refunds flow through four stages (requested → approved → broadcast →
 * settled). The tracker renders each as a chip with an explicit text label
 * and an sr-only state suffix ("completed" / "current" / "upcoming") so
 * status is never conveyed by colour alone (WCAG 2.1 AA). ETA microcopy and
 * a summary note describe the current stage, and the transaction hash row
 * (once broadcast) offers a copy button with a success toast plus a
 * "View on explorer" link (noopener/noreferrer).
 *
 * Accessibility:
 *  - Branded section, four labelled stage chips with aria-current="step",
 *  - a polite live region announcing the current stage, and
 *  - focus-visible rings on all interactive elements.
 */

export const REFUND_STAGES = [
  "requested",
  "approved",
  "broadcast",
  "settled",
] as const;

export type RefundStage = (typeof REFUND_STAGES)[number];

export type RefundTrackerProps = {
  /** The stage the refund is currently at. */
  currentStage: RefundStage;
  /** On-chain Stellar transaction hash, present once broadcast. */
  transactionHash?: string;
  /** Ledger explorer base URL. Defaults to stellar.expert public explorer. */
  explorerBaseUrl?: string;
  /** Human-readable ETA, e.g. "by Apr 3, 12:00 UTC". */
  estimatedCompletion?: string;
  /** Optional amount being refunded, e.g. "150 XLM". */
  amount?: string;
};

type RefundStageState = "complete" | "current" | "pending";

const DEFAULT_EXPLORER_BASE_URL = "https://stellar.expert/explorer/public/tx";

const REFUND_STAGE_COPY: Record<
  RefundStage,
  { label: string; note: string }
> = {
  requested: {
    label: "Requested",
    note: "Your refund request has been received and is awaiting approval.",
  },
  approved: {
    label: "Approved",
    note: "Your refund was approved and is being prepared for broadcast.",
  },
  broadcast: {
    label: "Broadcast",
    note: "The refund transaction has been broadcast to the Stellar network and is settling on-chain.",
  },
  settled: {
    label: "Settled",
    note: "Your refund has settled on-chain. The funds are on their way to your account.",
  },
};

const stageStateLabel: Record<RefundStageState, string> = {
  complete: "completed",
  current: "current",
  pending: "upcoming",
};

const chipClasses: Record<RefundStageState, string> = {
  complete:
    "border-emerald-400/40 bg-emerald-400/10 text-emerald-100",
  current:
    "border-cyan-400/70 bg-cyan-400/10 text-cyan-100",
  pending: "border-white/10 bg-white/[0.04] text-slate-400",
};

export function RefundTracker({
  currentStage,
  transactionHash,
  explorerBaseUrl = DEFAULT_EXPLORER_BASE_URL,
  estimatedCompletion,
  amount,
}: RefundTrackerProps) {
  const headingId = useId();
  const { toast } = useToast();

  const currentIndex = REFUND_STAGES.indexOf(currentStage);
  const isValid = currentIndex !== -1;

  const etaPrefix = "Estimated completion";
  const etaText = estimatedCompletion
    ? `${etaPrefix}: ${estimatedCompletion}.`
    : `${etaPrefix}: typically within 2–4 hours.`;

  const announcement = isValid
    ? `Refund stage ${currentIndex + 1} of ${REFUND_STAGES.length}: ${
        REFUND_STAGE_COPY[currentStage].label
      }. ${REFUND_STAGE_COPY[currentStage].note}${
        currentStage === "settled" ? "" : ` ${etaText}`
      }`
    : "Refund status unavailable.";

  const handleCopied = useCallback(() => {
    toast({
      variant: "success",
      title: "Copied",
      description: "Transaction hash copied to clipboard.",
      duration: 2000,
    });
  }, [toast]);

  if (!isValid) {
    return (
      <div className="space-y-4">
        <LiveRegion role="status" ariaLive="polite">
          {`Refund stage ${REFUND_STAGES.length}. Refund status unavailable.`}
        </LiveRegion>
        <div
          role="alert"
          className="rounded-2xl border border-amber-400/25 bg-amber-500/5 p-4"
        >
          <p className="text-sm font-medium text-amber-100">
            Refund status unavailable
          </p>
          <p className="mt-1 text-xs text-amber-50/80">
            We couldn&apos;t determine the current refund stage. Please refresh the
            page or contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <LiveRegion role="status" ariaLive="polite">
        {announcement}
      </LiveRegion>

      {/* Heading row */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={headingId} className="text-base font-semibold text-white">
          Refund status
        </h3>
        <HelpPopover
          term={glossary.refundTracking}
          triggerLabel="Help: refund tracking"
        />
        {amount ? (
          <span className="ml-auto rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-100">
            Refund of {amount}
          </span>
        ) : null}
      </div>

      {/* Stage chips */}
      <ol
        aria-label="Refund stages"
        className="flex flex-wrap items-center gap-x-2 gap-y-3"
      >
        {REFUND_STAGES.map((stage, index) => {
          const state: RefundStageState =
            index < currentIndex
              ? "complete"
              : index === currentIndex
                ? "current"
                : "pending";
          return (
            <li
              key={stage}
              className="flex items-center gap-2"
              aria-current={state === "current" ? "step" : undefined}
            >
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${chipClasses[state]}`}
              >
                {state === "complete" ? (
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                ) : (
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      state === "current"
                        ? "bg-cyan-300"
                        : "bg-slate-500"
                    }`}
                  />
                )}
                {REFUND_STAGE_COPY[stage].label}
                <span className="sr-only">({stageStateLabel[state]})</span>
              </span>
              {index < REFUND_STAGES.length - 1 ? (
                <span aria-hidden="true" className="h-px w-3 bg-white/10" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {/* Stage summary + ETA */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Stage summary
        </p>
        <p className="mt-2 text-sm text-slate-200">
          {REFUND_STAGE_COPY[currentStage].note}
        </p>
        <p
          className={`mt-2 text-sm font-medium ${
            currentStage === "settled" ? "text-emerald-300" : "text-cyan-200"
          }`}
        >
          {currentStage === "settled"
            ? `Refund complete${amount ? ` — ${amount} returned to your account` : ""}.`
            : etaText}
        </p>
      </div>

      {/* Transaction hash row */}
      {transactionHash ? (
        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Transaction hash
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-200" title={transactionHash}>
                {truncateHash(transactionHash)}
              </span>
              <CopyButton
                text={transactionHash}
                variant="icon"
                label="Copy transaction hash"
                onCopied={handleCopied}
              />
              <a
                href={`${explorerBaseUrl}/${transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-300/30 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                View on explorer
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <p role="status" className="text-sm text-slate-400">
          Transaction hash will appear once the refund is broadcast.
        </p>
      )}
    </section>
  );
}
