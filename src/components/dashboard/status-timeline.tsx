"use client";

import { useState, useRef, useId, useCallback } from "react";
import { TimelineItem, TimelineNode, TimelineBranchGroup, statusToneMap } from "./timeline-types";
import { StatusChip } from "./status-chip";
import { KycDocUpload } from "./kyc-doc-upload";
import { KycLivenessCapture } from "./kyc-liveness-capture";
import { Filter, GitFork, GitMerge, MessageSquareText } from "lucide-react";

interface StatusTimelineProps {
  items: TimelineNode[];
  /**
   * When provided, a GraceBanner is rendered above the timeline entries
   * showing a live countdown until the grace window expires.
   */
  graceExpiresAt?: number;
  /** Called when user clicks "Notify supplier" inside the banner */
  onNotifySupplier?: () => void;
  /** Called when the grace window expires */
  onGraceExpired?: () => void;
}

// ─── Helper: flatten all TimelineItems from a TimelineNode[] ─────────────

function flattenItems(nodes: TimelineNode[]): TimelineItem[] {
  const result: TimelineItem[] = [];
  for (const node of nodes) {
    if ("type" in node && node.type === "branch-group") {
      for (const branch of node.branches) {
        result.push(...branch);
      }
    } else {
      result.push(node as TimelineItem);
    }
  }
  return result;
}

// ─── Helper: check if a node is a TimelineBranchGroup ───────────────────

function isBranchGroup(node: TimelineNode): node is TimelineBranchGroup {
  return "type" in node && node.type === "branch-group";
}

// ─── Helper: filter milestones from a list of nodes ────────────────────

function filterMilestoneNodes(nodes: TimelineNode[]): TimelineNode[] {
  return nodes
    .map((node) => {
      if (isBranchGroup(node)) {
        const filteredBranches = node.branches
          .map((branch) => branch.filter((item) => item.isMilestone))
          .filter((branch) => branch.length > 0);
        if (filteredBranches.length === 0) return null;
        return { ...node, branches: filteredBranches } as TimelineBranchGroup;
      }
      if ((node as TimelineItem).isMilestone) return node;
      return null;
    })
    .filter(Boolean) as TimelineNode[];
}

// ═══════════════════════════════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════════════════════════════

export function StatusTimeline({ items }: StatusTimelineProps) {
  const [milestonesOnly, setMilestonesOnly] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const statusId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const scrollTopRef = useRef(0);

  // Determine which items to display
  const displayedNodes = milestonesOnly
    ? filterMilestoneNodes(items)
    : items;

  // Check whether any items have milestones (across all branches)
  const flatItems = flattenItems(items);
  const hasMilestones = flatItems.some((item) => item.isMilestone);

  function handleToggle() {
    if (listRef.current) {
      scrollTopRef.current = listRef.current.scrollTop;
    }

    const next = !milestonesOnly;
    setMilestonesOnly(next);

    setAnnouncement(
      next ? "Showing milestones only" : "Showing all timeline events",
    );

    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = scrollTopRef.current;
      }
    });
  }

  return (
    <section className="space-y-4" aria-label="Status timeline">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
            Timeline
          </span>
        </div>

        {hasMilestones ? (
          <button
            type="button"
            role="switch"
            aria-checked={milestonesOnly}
            aria-label={
              milestonesOnly
                ? "Show all timeline events"
                : "Show milestones only"
            }
            onClick={handleToggle}
            className={[
              "group relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
              milestonesOnly ? "bg-cyan-500" : "bg-white/10 hover:bg-white/20",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={[
                "inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-200",
                milestonesOnly ? "translate-x-[22px]" : "translate-x-[2px]",
              ].join(" ")}
            />
          </button>
        ) : null}
      </div>

      {/* ── Milestones-mode label for quick visual scan ──────────────────── */}
      {milestonesOnly && (() => {
        const milestoneCount = flattenItems(displayedNodes).length;
        return milestoneCount > 0 ? (
          <p className="text-xs text-cyan-400" aria-live="polite">
            {milestoneCount} milestone{milestoneCount !== 1 ? "s" : ""} shown
          </p>
        ) : null;
      })()}

      {/* ── Timeline list ────────────────────────────────────────────────── */}
      <ol
        ref={listRef}
        aria-label="Timeline events"
        className="relative ml-3 max-h-[600px] border-s border-white/10 overflow-y-auto"
      >
        {displayedNodes.map((node, index) => {
          if (isBranchGroup(node)) {
            return (
              <BranchGroupEntry
                key={node.id}
                group={node}
                isLast={index === displayedNodes.length - 1}
              />
            );
          }
          return (
            <TimelineEntry
              key={(node as TimelineItem).id}
              item={node as TimelineItem}
              isLast={index === displayedNodes.length - 1}
            />
          );
        })}
      </ol>

      {/* ── Polite screen-reader announcement ───────────────────────────── */}
      <div
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Branch group sub-component
// ═══════════════════════════════════════════════════════════════════════

function BranchGroupEntry({
  group,
  isLast,
}: {
  group: TimelineBranchGroup;
  isLast: boolean;
}) {
  const containerRef = useRef<HTMLLIElement>(null);
  const branchLabelsId = useId();
  const [focusedBranchIndex, setFocusedBranchIndex] = useState(0);

  const branchCount = group.branches.length;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = (focusedBranchIndex + 1) % branchCount;
        setFocusedBranchIndex(nextIndex);
        const branchEls = containerRef.current?.querySelectorAll("[data-branch-index]");
        if (branchEls && branchEls[nextIndex]) {
          (branchEls[nextIndex] as HTMLElement).focus();
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const nextIndex = (focusedBranchIndex - 1 + branchCount) % branchCount;
        setFocusedBranchIndex(nextIndex);
        const branchEls = containerRef.current?.querySelectorAll("[data-branch-index]");
        if (branchEls && branchEls[nextIndex]) {
          (branchEls[nextIndex] as HTMLElement).focus();
        }
      }
    },
    [branchCount, focusedBranchIndex],
  );

  return (
    <li
      ref={containerRef}
      role="group"
      aria-label={`Branch group: ${group.label}`}
      aria-labelledby={branchLabelsId}
      className={`relative mb-10 ml-6 ${isLast ? "mb-0" : ""}`}
    >
      {/* ── Fork indicator (dot) ───────────────────────────────── */}
      <span
        className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 ring-8 ring-slate-900"
        aria-hidden="true"
      >
        <GitFork className="h-3.5 w-3.5 text-white" />
      </span>

      {/* ── Branch group content ───────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Fork label */}
        <div className="flex items-center gap-2">
          <span
            id={branchLabelsId}
            className="text-xs font-bold uppercase tracking-wider text-amber-400"
          >
            {group.label}
          </span>
          <span className="text-xs text-slate-500">
            {branchCount} branch{branchCount !== 1 ? "es" : ""}
          </span>
        </div>

        {/* ── Parallel branches ──────────────────────────────────── */}

        {/* Visual: branch connector lines that split from main timeline */}
        <div className="relative" onKeyDown={handleKeyDown}>
          {group.branches.map((branch, branchIndex) => {
            const isLastBranch = branchIndex === branchCount - 1;
            const hasRejoin = !!group.rejoinLabel;

            return (
              <div
                key={`${group.id}-branch-${branchIndex}`}
                data-branch-index={branchIndex}
                tabIndex={0}
                role="group"
                aria-label={`Branch ${branchIndex + 1}: ${branch.map((i) => i.title).join(", ")}`}
                className={[
                  "relative pl-6 mb-4",
                  isLastBranch && !hasRejoin ? "mb-0" : "",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded",
                ].join(" ")}
              >
                {/* Branch vertical line (lighter than main timeline) */}
                <span
                  className="absolute left-0 top-0 bottom-0 w-px bg-white/5"
                  aria-hidden="true"
                />

                {/* Branch connector (horizontal line from main timeline to branch) */}
                <span
                  className="absolute -left-[18px] top-3 h-px w-[18px] bg-white/10"
                  aria-hidden="true"
                />

                {/* Branch heading label */}
                <div className="mb-2 flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full bg-white/20"
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Branch {branchIndex + 1}
                  </span>
                </div>

                {/* Branch items */}
                <div className="relative border-l border-white/10 ml-1">
                  {branch.map((item, itemIndex) => (
                    <TimelineEntry
                      key={item.id}
                      item={item}
                      isLast={itemIndex === branch.length - 1}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* ── Rejoin marker ────────────────────────────────────────── */}
          {group.rejoinLabel && (
            <div className="relative pl-6 mt-2" role="region" aria-label={`Rejoin: ${group.rejoinLabel}`}>
              {/* Horizontal connector from branches back to main line */}
              <span
                className="absolute -left-[18px] top-3 h-px w-[18px] bg-white/10"
                aria-hidden="true"
              />
              {/* Rejoin dot */}
              <span
                className="absolute -left-[7px] top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/80 ring-4 ring-slate-900"
                aria-hidden="true"
              >
                <GitMerge className="h-2.5 w-2.5 text-white" />
              </span>
              <div className="flex items-center gap-2 ml-1">
                <GitMerge className="h-3 w-3 text-emerald-400" aria-hidden="true" />
                <span className="text-xs font-semibold tracking-wider text-emerald-400">
                  {group.rejoinLabel}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Timeline entry sub-component
// ═══════════════════════════════════════════════════════════════════════

function TimelineEntry({ item, isLast }: { item: TimelineItem; isLast: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = Boolean(item.details || item.actor);

  return (
    <li className={`ms-6 ${isLast ? "" : "mb-10"}`}>
      <span
        className={`absolute -start-3 flex h-6 w-6 items-center justify-center rounded-full ring-8 ring-slate-950 ${
          item.status === "completed" ? "bg-emerald-500" : "bg-slate-700"
        }`}
        aria-hidden="true"
      >
        {item.isMilestone ? (
          <span className="h-2 w-2 rounded-full bg-white/80" />
        ) : null}
      </span>

      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h3
              className="text-sm font-semibold text-white"
              aria-current={item.isCurrent ? "step" : undefined}
            >
              {item.title}
              {item.isMilestone ? (
                <span className="ms-2 inline-flex items-center rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300">
                  Milestone
                </span>
              ) : null}
            </h3>
            <p className="text-sm text-slate-400">{item.timestamp}</p>
          </div>
          <StatusChip tone={statusToneMap[item.status]}>{item.status}</StatusChip>
        </div>

        {item.variant === "mediator_assigned" && item.mediator ? (
          <MediatorAssignmentCard item={item} />
        ) : null}

        {hasDetails ? (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            aria-controls={`details-${item.id}`}
            className="rounded text-left text-sm text-cyan-400 hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {isExpanded ? "Hide details" : "Show details"}
          </button>
        ) : null}
      </div>

      {isExpanded && hasDetails ? (
        <div
          id={`details-${item.id}`}
          role="region"
          aria-label={`Details for ${item.title}`}
          className="mt-3 rounded-2xl bg-white/5 p-4 text-sm text-slate-300"
        >
          {item.actor ? <p>Actor: {item.actor}</p> : null}
          {item.details ? <p className={item.actor ? "mt-1" : ""}>{item.details}</p> : null}
          {item.id === "kyc-liveness" && item.status === "pending" ? (
            <div className="mt-4">
              <KycLivenessCapture onCaptureComplete={() => {}} />
            </div>
          ) : null}
          {item.id === "kyc-doc-upload" && item.status === "pending" ? (
            <div className="mt-4">
              <KycDocUpload onCaptureComplete={() => {}} />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function MediatorAssignmentCard({ item }: { item: TimelineItem }) {
  const mediator = item.mediator!;
  const meterValue = typeof mediator.slaProgress === "number"
    ? Math.min(100, Math.max(0, mediator.slaProgress))
    : null;

  return (
    <section
      className="rounded-3xl border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(15,23,42,0.92))] p-4 shadow-[0_20px_60px_-30px_rgba(34,211,238,0.35)]"
      aria-label={`Mediator assignment for ${mediator.name}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-cyan-200">
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Mediator assigned
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-white">{mediator.name}</p>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-200">
              Neutral review has started. Keep all dispute updates in one thread
              so both parties and the mediator can track the latest context.
            </p>
          </div>
        </div>

        {mediator.directMessageHref ? (
          <a
            href={mediator.directMessageHref}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            {mediator.directMessageLabel ?? "Message mediator"}
          </a>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Response SLA
          </dt>
          <dd className="mt-2 text-sm font-medium text-white">
            {mediator.responseSlaLabel ?? "Pending confirmation"}
          </dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Due by
          </dt>
          <dd className="mt-2 text-sm font-medium text-white">
            {mediator.responseDueLabel ?? "No deadline set"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
            SLA window
          </p>
          <p className="text-xs text-slate-400">
            {meterValue === null ? "Not available" : `${meterValue}% elapsed`}
          </p>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-label={`Mediator SLA progress for ${mediator.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={meterValue ?? undefined}
          aria-valuetext={
            meterValue === null
              ? "SLA progress not available"
              : `${meterValue}% of the response window elapsed`
          }
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-teal-300 to-emerald-300"
            style={{ width: `${meterValue ?? 0}%` }}
          />
        </div>
      </div>
    </section>
  );
}
