import { motion, useReducedMotion } from "motion/react";
import { spring } from "@/components/motion/springs";

export type Bar = {
  id: string;
  label: string;
  value: number;
  tone?: "default" | "warn" | "danger";
};

const tones = {
  default: "bg-accent",
  warn: "bg-honey",
  danger: "bg-line-strong",
} as const;

/**
 * Horizontal bars. Horizontal rather than vertical because the labels are
 * product titles: vertical bars would need rotated text or truncation to
 * nothing, and the reader is comparing lengths either way.
 */
export function BarChart({
  bars,
  formatValue,
  ariaLabel,
  emptyLabel = "Nothing to show yet",
}: {
  bars: Bar[];
  formatValue: (value: number) => string;
  ariaLabel: string;
  emptyLabel?: string;
}) {
  const reduced = useReducedMotion();
  const highest = Math.max(...bars.map((bar) => bar.value), 0);

  if (bars.length === 0) {
    return <p className="text-ink-muted text-[14px]">{emptyLabel}</p>;
  }

  return (
    <ul className="flex flex-col gap-4" aria-label={ariaLabel}>
      {bars.map((bar, index) => {
        // Zero-value bars still get a sliver so the row reads as "none" rather
        // than as a rendering failure.
        const ratio = highest > 0 ? bar.value / highest : 0;
        const width = bar.value === 0 ? 2 : Math.max(ratio * 100, 4);

        return (
          <li key={bar.id} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-title truncate text-[14px]">{bar.label}</span>
              <span className="tnum text-ink-muted shrink-0 text-[13px]">
                {formatValue(bar.value)}
              </span>
            </div>

            <div className="bg-sunken h-2 w-full overflow-hidden rounded-full">
              <motion.div
                className={`h-full rounded-full ${tones[bar.tone ?? "default"]}`}
                initial={reduced ? { width: `${width}%` } : { width: 0 }}
                animate={{ width: `${width}%` }}
                transition={
                  reduced ? undefined : { ...spring.ui, delay: index * 0.05 }
                }
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
