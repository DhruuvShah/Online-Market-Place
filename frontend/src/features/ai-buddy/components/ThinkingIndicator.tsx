import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  PHRASE_INTERVAL,
  thinkingPhrase,
} from "@/features/ai-buddy/thinkingPhrases";

export function ThinkingIndicator() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setStep((current) => current + 1),
      PHRASE_INTERVAL,
    );
    return () => clearInterval(timer);
  }, []);

  const phrase = thinkingPhrase(step);

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mt-4 flex items-center gap-3"
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

      {/* aria-live sits on the wrapper, not the animated child: the child is
          replaced on every step and a swapped-out live region goes silent. */}
      <span
        className="text-ink-subtle relative text-[13px]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={phrase}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="block"
          >
            {phrase}…
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.div>
  );
}
