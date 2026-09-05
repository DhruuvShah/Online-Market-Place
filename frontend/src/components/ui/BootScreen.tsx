import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useServiceWakeup } from "@/hooks/useServiceWakeup";
import { spring } from "@/components/motion/springs";

const HEX = "M16 3 L27.26 9.5 L27.26 22.5 L16 29 L4.74 22.5 L4.74 9.5 Z";

/**
 * Shown while the backend cold-starts. The services really are being woken, so
 * the screen reports actual progress rather than spinning at a blank page —
 * a wait you can watch is a different experience from one you cannot.
 */
export function BootScreen() {
  const reduced = useReducedMotion();
  const { services, ready, total, elapsed, slow } = useServiceWakeup();

  const progress = total > 0 ? ready / total : 0;

  return (
    <div className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center">
        <div className="relative grid h-24 w-24 place-items-center">
          {/* Two hexagons tracing the mark outward, like a signal going out. */}
          {!reduced &&
            [0, 1].map((ring) => (
              <motion.svg
                key={ring}
                viewBox="0 0 32 32"
                fill="none"
                className="text-accent absolute h-24 w-24"
                initial={{ scale: 0.55, opacity: 0 }}
                animate={{ scale: 1.15, opacity: [0, 0.35, 0] }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: ring * 1.3,
                }}
              >
                <path
                  d={HEX}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </motion.svg>
            ))}

          <motion.div
            animate={reduced ? undefined : { scale: [1, 1.05, 1] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Logo withWordmark={false} className="[&_svg]:h-10 [&_svg]:w-10" />
          </motion.div>
        </div>

        <h1 className="font-display mt-7 text-center text-2xl">
          Waking the marketplace
        </h1>

        <p className="text-ink-muted mt-3 text-center text-[14px] leading-relaxed">
          The services sleep when nobody is shopping. They are starting up now —
          this only happens on the first visit after a quiet spell.
        </p>

        <div className="mt-9 w-full">
          <div className="bg-sunken h-1 w-full overflow-hidden rounded-full">
            <motion.div
              className="bg-accent h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={reduced ? { duration: 0 } : spring.ui}
            />
          </div>

          <div className="text-ink-subtle mt-3 flex items-center justify-between text-[12px]">
            <span className="tnum">
              {ready} of {total} ready
            </span>
            <span className="tnum">{elapsed}s</span>
          </div>
        </div>

        <ul className="mt-7 flex w-full flex-col gap-2.5">
          {services.map((service, index) => {
            const isReady = service.status === "ready";

            return (
              <motion.li
                key={service.key}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="flex items-center gap-3 text-[13px]"
              >
                <span className="grid h-4 w-4 shrink-0 place-items-center">
                  <AnimatePresence mode="wait" initial={false}>
                    {isReady ? (
                      <motion.span
                        key="ready"
                        initial={reduced ? false : { scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={spring.momentum}
                        className="bg-accent text-accent-contrast grid h-4 w-4 place-items-center rounded-full"
                      >
                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="waiting"
                        exit={{ opacity: 0 }}
                        animate={
                          reduced ? undefined : { opacity: [0.3, 1, 0.3] }
                        }
                        transition={{
                          duration: 1.4,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: index * 0.12,
                        }}
                        className="border-line-strong h-2 w-2 rounded-full border-2"
                      />
                    )}
                  </AnimatePresence>
                </span>

                <span className={isReady ? "text-ink" : "text-ink-subtle"}>
                  {service.label}
                </span>
              </motion.li>
            );
          })}
        </ul>

        <AnimatePresence>
          {slow && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-ink-subtle border-line mt-8 border-t pt-6 text-center text-[13px] leading-relaxed"
            >
              Still going. A cold start can take a minute or so when every
              service has to boot at once — nothing is broken.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
