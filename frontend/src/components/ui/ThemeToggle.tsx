import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const icons = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const labels = {
  system: "Theme: follow system",
  light: "Theme: light",
  dark: "Theme: dark",
};

export function ThemeToggle() {
  const { theme, cycle } = useTheme();
  const Icon = icons[theme];

  return (
    <button
      onClick={cycle}
      aria-label={labels[theme]}
      title={labels[theme]}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--ink-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--ink)]"
    >
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}
