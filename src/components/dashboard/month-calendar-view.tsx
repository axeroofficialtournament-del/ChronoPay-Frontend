"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { CalendarHeatmapLegend, type HeatmapIntensity } from "./calendar-heatmap-legend";

export interface MonthCalendarViewProps {
  /** Currently selected date */
  selectedDate: Date;
  /** Callback when a date is selected */
  onDateSelect: (date: Date) => void;
  /** Availability data: ISO date string (YYYY-MM-DD) -> slot count */
  availabilityData: Map<string, number>;
  /** Whether heatmap overlay is enabled */
  heatmapEnabled?: boolean;
  /** Callback when heatmap toggle changes */
  onHeatmapToggle?: (enabled: boolean) => void;
  /** Custom class name */
  className?: string;
  /** Locale for date formatting */
  locale?: string;
  /** Minimum date (inclusive) */
  minDate?: Date;
  /** Maximum date (inclusive) */
  maxDate?: Date;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Determines heatmap intensity based on slot count.
 * 5-step ramp: none (0), low (1-2), medium (3-5), high (6-9), peak (10+)
 */
function getHeatmapIntensity(slots: number): HeatmapIntensity {
  if (slots === 0) return "none";
  if (slots <= 2) return "low";
  if (slots <= 5) return "medium";
  if (slots <= 9) return "high";
  return "peak";
}

/**
 * Gets CSS variable names for a given intensity
 */
function getIntensityStyles(intensity: HeatmapIntensity): React.CSSProperties {
  const step = intensity === "none" ? 1 :
               intensity === "low" ? 2 :
               intensity === "medium" ? 3 :
               intensity === "high" ? 4 : 5;

  return {
    backgroundColor: `var(--heatmap-step-${step})`,
    backgroundImage: `var(--heatmap-step-${step}-pattern)`,
    backgroundSize: `var(--heatmap-step-${step}-pattern-size)`,
  } as React.CSSProperties;
}

function formatDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getDate() === b.getDate() &&
         a.getMonth() === b.getMonth() &&
         a.getFullYear() === b.getFullYear();
}

function isDateInRange(date: Date, min?: Date, max?: Date): boolean {
  if (min && date < min) return false;
  if (max && date > max) return false;
  return true;
}

export function MonthCalendarView({
  selectedDate,
  onDateSelect,
  availabilityData = new Map(),
  heatmapEnabled = false,
  onHeatmapToggle,
  className = "",
  locale = "en-US",
  minDate,
  maxDate,
}: MonthCalendarViewProps) {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const [focusedDayIndex, setFocusedDayIndex] = useState<number>(-1);

  // Compute days for the current view month
  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const totalDays = lastDay.getDate();

    const result: (Date | null)[] = [];

    // Previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      result.push(new Date(year, month - 1, prevMonthLastDay - i));
    }

    // Current month's days
    for (let i = 1; i <= totalDays; i++) {
      result.push(new Date(year, month, i));
    }

    // Next month's leading days to fill 6 rows (42 cells)
    const remainingCells = 42 - result.length;
    for (let i = 1; i <= remainingCells; i++) {
      result.push(new Date(year, month + 1, i));
    }

    return result;
  }, [viewDate]);

  // Find the index of the selected date in the grid
  useEffect(() => {
    const idx = days.findIndex((d) => d && isSameDay(d, selectedDate));
    // The roving focus target must follow the externally selected date.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prop-sync
    if (idx >= 0) setFocusedDayIndex(idx);
  }, [selectedDate, days]);

  const navigateMonth = useCallback((direction: number) => {
    setViewDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  }, []);

  const handleDayClick = useCallback(
    (date: Date | null, index: number) => {
      if (!date) return;
      if (!isDateInRange(date, minDate, maxDate)) return;
      onDateSelect(date);
      setFocusedDayIndex(index);
    },
    [onDateSelect, minDate, maxDate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const date = days[index];
      if (!date) return;

      let newIndex = index;
      const cols = 7;
      const rows = 6;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          newIndex = Math.min(index + 1, days.length - 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          newIndex = Math.max(index - 1, 0);
          break;
        case "ArrowDown":
          e.preventDefault();
          newIndex = Math.min(index + cols, days.length - 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          newIndex = Math.max(index - cols, 0);
          break;
        case "Home":
          e.preventDefault();
          newIndex = Math.floor(index / cols) * cols;
          break;
        case "End":
          e.preventDefault();
          newIndex = Math.min(Math.floor(index / cols) * cols + cols - 1, days.length - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleDayClick(date, index);
          return;
        case "PageUp":
          e.preventDefault();
          navigateMonth(-1);
          return;
        case "PageDown":
          e.preventDefault();
          navigateMonth(1);
          return;
        default:
          return;
      }

      // Skip null dates (prev/next month padding)
      while (newIndex >= 0 && newIndex < days.length && !days[newIndex]) {
        newIndex += e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
      }

      if (newIndex >= 0 && newIndex < days.length) {
        // The day-button ref callback focuses the element when its index
        // matches focusedDayIndex, so no direct DOM focus is needed here.
        setFocusedDayIndex(newIndex);
      }
    },
    [days, handleDayClick, navigateMonth]
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div
      className={clsx(
        "rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4",
        className
      )}
      role="region"
      aria-label="Month calendar"
    >
      {/* Month Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => navigateMonth(-1)}
          className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-ring-cyan"
          aria-label={`Previous month, ${monthNames[(viewDate.getMonth() + 11) % 12]}`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <h3 className="text-sm font-semibold text-white">
          {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
        </h3>

        <button
          onClick={() => navigateMonth(1)}
          className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-ring-cyan"
          aria-label={`Next month, ${monthNames[(viewDate.getMonth() + 1) % 12]}`}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="mb-2 grid grid-cols-7 gap-1" role="row" aria-hidden="true">
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium uppercase tracking-wider text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar days">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" aria-hidden="true" />;
          }

          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const isCurrentMonth = date.getMonth() === viewDate.getMonth();
          const isInRange = isDateInRange(date, minDate, maxDate);
          const dateKey = formatDateKey(date);
          const slotCount = availabilityData.get(dateKey) || 0;
          const intensity = getHeatmapIntensity(slotCount);
          const hasAvailability = slotCount > 0;

          const dayButton = (
            <button
              key={dateKey}
              ref={(el) => {
                if (el && index === focusedDayIndex) {
                  el.focus();
                }
              }}
              onClick={() => handleDayClick(date, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              disabled={!isInRange}
              className={clsx(
                "relative aspect-square rounded-lg text-xs font-medium transition-all focus-ring-cyan",
                "flex flex-col items-center justify-center",
                isInRange
                  ? isCurrentMonth
                    ? "text-slate-300 hover:bg-white/5"
                    : "text-slate-600 hover:bg-white/3"
                  : "text-slate-700 pointer-events-none",
                isSelected && "bg-cyan-500 text-white shadow-lg shadow-cyan-500/25",
                isToday && !isSelected && "bg-white/10 text-white ring-1 ring-white/20",
                !isInRange && "opacity-30",
                hasAvailability && "font-semibold"
              )}
              aria-label={
                `${date.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" })}` +
                `${isSelected ? ", selected" : ""}` +
                `${isToday ? ", today" : ""}` +
                `${hasAvailability ? `, ${slotCount} slot${slotCount !== 1 ? "s" : ""} available` : ", no availability"}`
              }
              aria-pressed={isSelected}
              role="gridcell"
              tabIndex={index === focusedDayIndex ? 0 : -1}
            >
              <span className="relative z-10">{date.getDate()}</span>

              {/* Heatmap overlay - applied as background on the button itself */}
              {heatmapEnabled && hasAvailability && (
                <span
                  className="pointer-events-none absolute inset-0 rounded-lg"
                  style={getIntensityStyles(intensity)}
                  aria-hidden="true"
                />
              )}

              {/* Availability indicator dot (complements heatmap, doesn't replace) */}
              {hasAvailability && (
                <span
                  className={clsx(
                    "relative z-10 mt-0.5 h-1 w-1 rounded-full",
                    intensity === "none"
                      ? "bg-transparent"
                      : intensity === "low"
                      ? "bg-emerald-400"
                      : intensity === "medium"
                      ? "bg-amber-400"
                      : intensity === "high"
                      ? "bg-rose-400"
                      : "bg-cyan-300"
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          );

          return dayButton;
        })}
      </div>

      {/* Heatmap Toggle & Legend */}
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onHeatmapToggle?.(!heatmapEnabled)}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring-cyan",
              heatmapEnabled
                ? "bg-cyan-500/20 text-cyan-100 shadow-sm"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            {heatmapEnabled ? "Hide heatmap" : "Show heatmap"}
          </button>
        </div>
        <CalendarHeatmapLegend />
      </div>
    </div>
  );
}