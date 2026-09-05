import type { ReactNode } from "react";

export type Stat = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "accent" | "warn";
};

const tones = {
  default: "",
  accent: "text-accent",
  warn: "text-honey",
} as const;

/**
 * Hairline-divided figures. The grid draws its rules with a 1px gap over a
 * line-coloured background, and every cell carries its own inline padding so
 * values never touch a rule.
 */
export function StatGrid({
  stats,
  columns = 3,
  children,
}: {
  stats: Stat[];
  columns?: 2 | 3 | 4;
  children?: ReactNode;
}) {
  const columnClass =
    columns === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "sm:grid-cols-2"
        : "sm:grid-cols-3";

  return (
    <div
      className={`bg-line border-line grid gap-px border-y ${columnClass}`}
      role="group"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="bg-canvas rule-cell">
          <div className={`text-stat ${tones[stat.tone ?? "default"]}`}>
            {stat.value}
          </div>
          <div className="text-ink-muted mt-2.5 text-[13px]">{stat.label}</div>
          {stat.hint && (
            <div className="text-ink-subtle mt-1 text-[12px]">{stat.hint}</div>
          )}
        </div>
      ))}
      {children}
    </div>
  );
}
