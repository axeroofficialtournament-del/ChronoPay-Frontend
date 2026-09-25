"use client";

import { ButtonLink } from "@/app/components/ui/button-link";
import { StatusChip } from "./status-chip";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import clsx from "clsx";
import { BidiIsolate, isRTL } from "@/utils/bidi";

export type DayAvailability = {
  date: Date;
  dayName: string;
  dateLabel: string;
  slotCount: number;
  status: "available" | "limited" | "full" | "none";
};

interface AvailabilityStripProps {
  days: DayAvailability[];
  onBook?: (date: Date) => void;
  className?: string;
  /** UI locale for bidi-aware date rendering. */
  locale?: string;
  /** Optional supplier ID to scope booking links to a specific supplier. */
  supplierId?: string;
  /** Optional href to the full availability view (e.g. supplier profile availability tab). */
  fullAvailabilityHref?: string;
}

const statusLabels: Record<DayAvailability["status"], string> = {
  available: "Available",
  limited: "Limited",
  full: "Full",
  none: "No slots",
};

export function AvailabilityStrip({
  days,
  onBook,
  className = "",
  locale = "en",
  supplierId,
  fullAvailabilityHref,
}: AvailabilityStripProps) {
  const [startIndex, setStartIndex] = useState(0);
  const visibleDays = 7;

  const canScrollLeft = startIndex > 0;
  const canScrollRight = startIndex + visibleDays < days.length;

  const handleScrollLeft = () => {
    if (canScrollLeft) {
      setStartIndex((prev: number) => prev - 1);
    }
  };

  const handleScrollRight = () => {
    if (canScrollRight) {
      setStartIndex((prev: number) => prev + 1);
    }
  };

  const handleKeyDown = (e: KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  const visibleDaysData = days.slice(startIndex, startIndex + visibleDays);
  const rtl = isRTL(locale);

  if (days.length === 0) {
    return (
      <div
        className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <Calendar className="mx-auto mb-3 h-12 w-12 text-slate-500" aria-hidden="true" />
        <p className="text-sm text-slate-400">No availability data available</p>
        {fullAvailabilityHref && (
          <a
            href={fullAvailabilityHref}
            className="mt-4 inline-block rounded-full px-4 py-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 focus-ring-cyan"
          >
            View full availability
          </a>
        )}
      </div>
    );
  }

  return (
    <section
      className={clsx("rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 sm:p-5", className)}
      aria-label="7-day availability preview"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Quick Book - Next 7 Days
        </h2>
        <div className="flex items-center gap-2">
          {fullAvailabilityHref && (
            <a
              href={fullAvailabilityHref}
              className="hidden rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-white/10 focus-ring-cyan sm:inline-flex"
            >
              View all
            </a>
          )}
          <button
            onClick={handleScrollLeft}
            onKeyDown={(e) => handleKeyDown(e, handleScrollLeft)}
            disabled={!canScrollLeft}
            className={clsx(
              "rounded-full p-2 transition-colors focus-ring-cyan",
              canScrollLeft
                ? "bg-white/6 text-slate-100 hover:bg-white/10"
                : "pointer-events-none opacity-30 text-slate-500"
            )}
            aria-label="Previous days"
            aria-disabled={!canScrollLeft}
            tabIndex={canScrollLeft ? 0 : -1}
          >
            {rtl ? <ChevronRight className="h-5 w-5" aria-hidden="true" /> : <ChevronLeft className="h-5 w-5" aria-hidden="true" />}
          </button>
          <button
            onClick={handleScrollRight}
            onKeyDown={(e) => handleKeyDown(e, handleScrollRight)}
            disabled={!canScrollRight}
            className={clsx(
              "rounded-full p-2 transition-colors focus-ring-cyan",
              canScrollRight
                ? "bg-white/6 text-slate-100 hover:bg-white/10"
                : "pointer-events-none opacity-30 text-slate-500"
            )}
            aria-label="Next days"
            aria-disabled={!canScrollRight}
            tabIndex={canScrollRight ? 0 : -1}
          >
            {rtl ? <ChevronLeft className="h-5 w-5" aria-hidden="true" /> : <ChevronRight className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        role="list"
        aria-label="Available days for booking"
      >
        {visibleDaysData.map((day) => {
          const isBookable = day.status === "available" || day.status === "limited";
          const dayId = `day-${day.dateLabel.replace(/\s+/g, "-").toLowerCase()}`;

          return (
            <article
              key={dayId}
              className="rounded-xl border border-white/8 bg-white/4 p-4 transition-colors hover:border-white/12"
              role="listitem"
              aria-labelledby={`${dayId}-label`}
              aria-describedby={`${dayId}-status`}
            >
              <div className="mb-3">
                <p
                  id={`${dayId}-label`}
                  className="text-xs font-semibold uppercase tracking-wider text-slate-400"
                >
                  <BidiIsolate locale={locale}>{day.dayName}</BidiIsolate>
                </p>
                <p className="mt-1 text-sm font-medium text-white">
                  <BidiIsolate locale={locale}>{day.dateLabel}</BidiIsolate>
                </p>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-300">
                    {day.slotCount} {day.slotCount === 1 ? "slot" : "slots"}
                  </span>
                </div>
                <StatusChip
                  id={`${dayId}-status`}
                  tone={day.status === "available" ? "positive" : day.status === "limited" ? "warning" : day.status === "full" ? "critical" : "neutral"}
                  aria-label={`Status: ${statusLabels[day.status]}`}
                >
                  {statusLabels[day.status]}
                </StatusChip>
              </div>

              {isBookable ? (
                <ButtonLink
                  href={
                    supplierId
                      ? `/dashboard/slots?date=${day.date.toISOString()}&supplier=${encodeURIComponent(supplierId)}`
                      : `/dashboard/slots?date=${day.date.toISOString()}`
                  }
                  size="sm"
                  variant="primary"
                  className="w-full"
                  aria-label={`Book slots for ${day.dateLabel}`}
                  onClick={() => onBook?.(day.date)}
                >
                  Book
                </ButtonLink>
              ) : (
                <button
                  disabled
                  className="w-full rounded-full border border-white/12 bg-white/6 px-4 py-2.5 text-sm font-medium text-slate-500 opacity-60"
                  aria-label={`No slots available for ${day.dateLabel}`}
                >
                  {day.status === "full" ? "Fully Booked" : "Unavailable"}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {days.length > visibleDays && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Showing {startIndex + 1}-{Math.min(startIndex + visibleDays, days.length)} of {days.length} days
          </p>
        </div>
      )}

      {fullAvailabilityHref && (
        <div className="mt-4 text-center sm:hidden">
          <a
            href={fullAvailabilityHref}
            className="inline-flex items-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10 focus-ring-cyan"
          >
            View full availability
          </a>
        </div>
      )}
    </section>
  );
}
