import { motion, useReducedMotion } from "motion/react";

export function SuccessCheck({ size = 84 }: { size?: number }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <svg width={size} height={size} viewBox="0 0 84 84" fill="none" aria-hidden="true">
        <circle cx="42" cy="42" r="38" stroke="var(--color-accent)" strokeWidth="3" />
        <path
          d="M26 43.5 L37 54 L58 31"
          stroke="var(--color-accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 84 84" fill="none" aria-hidden="true">
      <motion.circle
        cx="42"
        cy="42"
        r="38"
        stroke="var(--color-accent)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0, rotate: -90 }}
        animate={{ pathLength: 1 }}
        style={{ originX: "50%", originY: "50%" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
      />
      <motion.path
        d="M26 43.5 L37 54 L58 31"
        stroke="var(--color-accent)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.38 }}
      />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <motion.circle
            key={i}
            cx="42"
            cy="42"
            r="2"
            fill="var(--color-accent)"
            initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
            animate={{
              opacity: [0, 1, 0],
              x: Math.cos(angle) * 46,
              y: Math.sin(angle) * 46,
              scale: 0.3,
            }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.6 }}
          />
        );
      })}
    </svg>
  );
}
