"use client";

/**
 * ToastContainer — fixed viewport region that renders stacked toasts.
 *
 * Placement: bottom-right on md+, bottom-center on mobile.
 * Stacking:  newest on top (flex-col-reverse), capped at TOAST_STACK_LIMIT.
 * Grouping:  same-category toasts are collapsed by the reducer into one entry.
 * Queue:     when the stack is full, overflow toasts are held in a FIFO queue
 *            and released automatically as slots free up. A small indicator
 *            shows how many toasts are waiting.
 *
 * A "Clear all" button appears when 2+ entries are visible so users can
 * dismiss the entire stack in one action — useful after a burst.
 */

import { Layers } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Toast } from "./toast";

export function ToastContainer() {
  const { toasts, dismiss, dismissAll, queued } = useToast();
  const reducedMotion = useReducedMotion();

  return (
    <div
      aria-label="Notifications"
      aria-live="off"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col-reverse gap-2 sm:bottom-6 sm:right-6"
    >
      {/* Queue indicator — shown when toasts are waiting */}
      <AnimatePresence>
        {queued.length > 0 && (
          <motion.div
            key="queue-indicator"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-auto flex justify-end"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-400 backdrop-blur-sm">
              <Layers className="h-3 w-3" aria-hidden="true" />
              <span>{queued.length} more notification{queued.length !== 1 ? "s" : ""} queued</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Clear all" — shown only when 2+ entries are present */}
      <AnimatePresence>
        {toasts.length >= 2 && (
          <motion.div
            key="clear-all"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            className="pointer-events-auto flex justify-end"
          >
            <button
              type="button"
              onClick={dismissAll}
              className="rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-400 backdrop-blur-sm transition-colors hover:bg-slate-700/80 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            >
              Clear all ({toasts.length})
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="sync">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
