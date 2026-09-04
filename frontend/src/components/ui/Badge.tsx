import type { ReactNode } from "react";

type Tone = "ok" | "warn" | "danger" | "muted" | "accent";

const tones: Record<Tone, string> = {
  ok: "border-line-strong text-ink-muted",
  warn: "border-honey text-honey",
  danger: "border-accent text-accent",
  muted: "border-line text-ink-subtle",
  accent: "border-accent bg-accent text-accent-contrast",
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
