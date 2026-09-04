import type { Transition } from "motion/react";

export const spring = {
  ui: { type: "spring", bounce: 0, duration: 0.35 },
  momentum: { type: "spring", bounce: 0.2, duration: 0.4 },
  sheet: { type: "spring", bounce: 0.15, duration: 0.3 },
  celebrate: { type: "spring", bounce: 0.35, duration: 0.6 },
} satisfies Record<string, Transition>;

export const reveal = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

export const staggerParent = (delay = 0.06) => ({
  hidden: {},
  visible: { transition: { staggerChildren: delay } },
});
