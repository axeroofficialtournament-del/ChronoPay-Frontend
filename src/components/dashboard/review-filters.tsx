import React from "react";
import clsx from "clsx";
import { ChevronDown, Filter } from "lucide-react";

export interface ReviewFiltersProps {
  /** The currently selected star filter (null means all stars) */
  selectedStars: number | null;
  /** Callback when star filter changes */
  onStarChange: (stars: number | null) => void;
  /** The currently selected sort order */
  sortBy: "recent" | "helpful" | "high" | "low";
  /** Callback when sort order changes */
  onSortChange: (sort: "recent" | "helpful" | "high" | "low") => void;
  className?: string;
}

/**
 * ReviewFilters
 *
 * Controls for filtering and sorting reviews.
 */
export function ReviewFilters({
  selectedStars,
  onStarChange,
  sortBy,
  onSortChange,
  className = "",
}: ReviewFiltersProps) {
  return (
    <div
      className={clsx(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        className
      )}
      data-testid="review-filters"
      role="search"
      aria-label="Filter and sort reviews"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Filter size={16} />
          <span>Filter by</span>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by star rating">
          <button
            type="button"
            className={clsx(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
              selectedStars === null
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
            )}
            onClick={() => onStarChange(null)}
            aria-pressed={selectedStars === null}
          >
            All
          </button>
          {[5, 4, 3, 2, 1].map((stars) => (
            <button
              key={stars}
              type="button"
              className={clsx(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                selectedStars === stars
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
              )}
              onClick={() => onStarChange(stars)}
              aria-pressed={selectedStars === stars}
            >
              {stars} <span aria-hidden="true">★</span>
              <span className="sr-only">stars</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="review-sort" className="text-sm font-medium text-slate-300">
          Sort by
        </label>
        <div className="relative">
          <select
            id="review-sort"
            className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as ReviewFiltersProps["sortBy"])}
          >
            <option value="recent">Most recent</option>
            <option value="helpful">Most helpful</option>
            <option value="high">Highest rating</option>
            <option value="low">Lowest rating</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
