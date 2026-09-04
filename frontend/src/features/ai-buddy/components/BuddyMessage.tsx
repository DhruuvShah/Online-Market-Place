import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const WORD_INTERVAL = 32;

export function BuddyMessage({
  text,
  animate,
}: {
  text: string;
  animate: boolean;
}) {
  const reduced = useReducedMotion();
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const shouldReveal = animate && !reduced;

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!shouldReveal || tick >= words.length) return;

    const timer = setTimeout(() => setTick((count) => count + 1), WORD_INTERVAL);
    return () => clearTimeout(timer);
  }, [shouldReveal, tick, words.length]);

  const revealed = shouldReveal ? Math.min(tick, words.length) : words.length;

  return (
    <motion.span
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", bounce: 0, duration: 0.45 }}
      className="bg-raised border-line max-w-[85%] rounded-md border px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap"
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={false}
          animate={{ opacity: index < revealed ? 1 : 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}
