import { LayoutGrid, Rows3, Square } from "lucide-react";
import type { ProductView } from "@/types";

const options: { value: ProductView; label: string; icon: typeof Rows3 }[] = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "list", label: "List", icon: Rows3 },
  { value: "large", label: "Large tiles", icon: Square },
];

export function ViewToggle({
  view,
  onChange,
}: {
  view: ProductView;
  onChange: (view: ProductView) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Layout"
      className="border-line-strong inline-flex rounded-full border p-0.5"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = view === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(value)}
            className={`grid h-8 w-9 place-items-center rounded-full transition-colors ${
              active
                ? "bg-ink text-canvas"
                : "text-ink-subtle hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}
