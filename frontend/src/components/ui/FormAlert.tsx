import { motion, useReducedMotion } from "motion/react";
import { AlertCircle } from "lucide-react";

export function FormAlert({ message }: { message: string | null }) {
  const reduced = useReducedMotion();

  if (!message) return null;

  return (
    <motion.div
      role="alert"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] px-3.5 py-3 text-[13px] text-[var(--ink)]"
    >
      <AlertCircle
        className="mt-px h-4 w-4 shrink-0 text-[var(--accent)]"
        strokeWidth={2}
      />
      <span>{message}</span>
    </motion.div>
  );
}
