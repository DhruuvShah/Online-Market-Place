import { useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

export type SeriesPoint = {
  date: string;
  value: number;
  label?: string;
};

type Props = {
  points: SeriesPoint[];
  formatValue: (value: number) => string;
  height?: number;
  ariaLabel: string;
};

const VIEW_WIDTH = 640;
const PADDING = { top: 12, right: 4, bottom: 4, left: 4 };

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

/**
 * A plain SVG sparkline. No charting library: the whole thing is one path, it
 * inherits the theme through currentColor, and it scales with its container
 * instead of needing a resize observer.
 */
export function LineChart({
  points,
  formatValue,
  height = 180,
  ariaLabel,
}: Props) {
  const reduced = useReducedMotion();
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  const { path, area, coords, peak } = useMemo(() => {
    const plotWidth = VIEW_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = height - PADDING.top - PADDING.bottom;
    const highest = Math.max(...points.map((point) => point.value), 0);
    // A flat zero series still needs a baseline to sit on rather than dividing
    // by zero and collapsing to NaN.
    const scale = highest > 0 ? highest : 1;

    const positions = points.map((point, index) => {
      const x =
        PADDING.left +
        (points.length > 1 ? (index / (points.length - 1)) * plotWidth : plotWidth / 2);
      const y = PADDING.top + plotHeight - (point.value / scale) * plotHeight;
      return { x, y, point };
    });

    const line = positions
      .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`)
      .join(" ");

    const base = PADDING.top + plotHeight;
    const filled = positions.length
      ? `${line} L${positions.at(-1)!.x.toFixed(2)} ${base} L${positions[0].x.toFixed(2)} ${base} Z`
      : "";

    return { path: line, area: filled, coords: positions, peak: highest };
  }, [points, height]);

  if (points.length === 0) return null;

  const hovered = active === null ? null : coords[active];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        className="text-accent block overflow-visible"
        onMouseLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill={`url(#${gradientId})`} />

        <motion.path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduced ? undefined : { pathLength: 0 }}
          animate={reduced ? undefined : { pathLength: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />

        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={PADDING.top}
              x2={hovered.x}
              y2={height - PADDING.bottom}
              stroke="currentColor"
              strokeWidth={1}
              strokeOpacity={0.3}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={hovered.x}
              cy={hovered.y}
              r={4}
              fill="currentColor"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}

        {/* Invisible hit targets: one column per point, so the pointer never
            has to land on the 2px line itself. */}
        {coords.map(({ point }, index) => (
          <rect
            key={point.date}
            x={(index / coords.length) * VIEW_WIDTH}
            y={0}
            width={VIEW_WIDTH / coords.length}
            height={height}
            fill="transparent"
            onMouseEnter={() => setActive(index)}
          />
        ))}
      </svg>

      <div className="text-ink-subtle mt-3 flex items-center justify-between text-[12px]">
        <span>{dayLabel(points[0].date)}</span>
        <span aria-live="polite" className="text-ink tnum">
          {hovered
            ? `${dayLabel(hovered.point.date)} · ${formatValue(hovered.point.value)}`
            : peak > 0
              ? `Peak ${formatValue(peak)}`
              : "No sales in this window"}
        </span>
        <span>{dayLabel(points.at(-1)!.date)}</span>
      </div>
    </div>
  );
}
