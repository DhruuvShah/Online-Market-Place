import { useCallback, useEffect, useState } from "react";
import type { ProductView } from "@/types";

const VIEWS: ProductView[] = ["grid", "list", "large"];

const isView = (value: unknown): value is ProductView =>
  typeof value === "string" && (VIEWS as string[]).includes(value);

/**
 * Remembers the chosen layout per surface, so a seller who prefers the list can
 * keep it while the catalog stays on tiles. Storage can throw outright in a
 * private window, so every access is guarded and falls back to the default.
 */
export function useProductView(scope: string, fallback: ProductView = "grid") {
  const key = `hivemind:view:${scope}`;

  const [view, setView] = useState<ProductView>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return isView(stored) ? stored : fallback;
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, view);
    } catch {
      // A remembered layout is a convenience, never a requirement.
    }
  }, [key, view]);

  const change = useCallback((next: ProductView) => {
    setView(isView(next) ? next : fallback);
  }, [fallback]);

  return [view, change] as const;
}
