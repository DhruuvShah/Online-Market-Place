import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "danger" | "muted" | "accent";

const tones: Record<Tone, string> = {
  ok: "border-[var(--border-strong)] text-[var(--ink-muted)]",
  warn: "border-[var(--honey)] text-[var(--honey)]",
  danger: "border-[var(--accent)] text-[var(--accent)]",
  muted: "border-[var(--border)] text-[var(--ink-subtle)]",
  accent: "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-contrast)]",
};

export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
