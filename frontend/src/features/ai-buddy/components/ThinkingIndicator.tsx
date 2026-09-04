import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const stages = [
  "Reading your message",
  "Searching the catalog",
  "Checking what is in stock",
  "Putting an answer together",
];

export function ThinkingIndicator() {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((current) => Math.min(current + 1, stages.length - 1));
    }, 1600);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mt-4 flex items-center gap-3"
      aria-live="polite"
    >
      <span className="border-line bg-raised inline-flex items-center gap-1.5 rounded-full border px-3 py-2">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            className="bg-accent block h-1.5 w-1.5 rounded-full"
            animate={
              reduced
                ? { opacity: 0.6 }
                : { opacity: [0.25, 1, 0.25], y: [0, -3, 0] }
            }
            transition={
              reduced
                ? undefined
                : {
                    duration: 1.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: dot * 0.16,
                  }
            }
          />
        ))}
      </span>

      <motion.span
        key={stage}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="text-ink-subtle text-[13px]"
      >
        {stages[stage]}…
      </motion.span>
    </motion.div>
  );
}
