import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { spring } from "@/components/motion/springs";

const benefits = [
  {
    n: "01",
    title: "Stock that is actually there",
    body: "Inventory is reserved the moment you check out, not after payment clears. If the last one sells while you are deciding, you find out immediately instead of getting an apology email.",
  },
  {
    n: "02",
    title: "Money handled precisely",
    body: "Every amount is computed on the server and charged to the rupee. Card details go straight to Razorpay and never touch our systems.",
  },
  {
    n: "03",
    title: "Ask for what you want",
    body: "Describe the thing you are looking for in a sentence. The assistant searches the catalog and can build your cart for you.",
  },
];

const steps = [
  {
    n: "01",
    title: "Find something",
    body: "Search the catalog, or describe what you want to the assistant.",
  },
  {
    n: "02",
    title: "Reserve it",
    body: "Adding to cart holds nothing. Checking out reserves the stock.",
  },
  {
    n: "03",
    title: "Pay and track",
    body: "Razorpay handles payment. Your order confirms the moment it clears.",
  },
];

const objections = [
  {
    q: "Is my payment safe?",
    a: "Razorpay processes every transaction. We never see or store card details, and each payment is verified by signature before an order is confirmed.",
  },
  {
    q: "What if the item sells out first?",
    a: "Stock is decremented atomically. Two people cannot buy the same last unit, and whoever misses it is told during checkout, not after paying.",
  },
  {
    q: "Who am I buying from?",
    a: "Every product belongs to a registered seller account. Sellers manage their own inventory and see their own orders. Nobody sells anonymously.",
  },
];

const stats = [
  { value: "9", label: "independent services" },
  { value: "100%", label: "server-side pricing" },
  { value: "0", label: "card details stored" },
  { value: "24/7", label: "assistant on call" },
];

export default function Landing() {
  const reduced = useReducedMotion();

  const rise = {
    hidden: { opacity: 0, y: reduced ? 0 : 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <section className="shell pt-32 pb-16 sm:pt-44 sm:pb-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.p
            variants={rise}
            transition={spring.ui}
            className="text-eyebrow text-[var(--ink-subtle)]"
          >
            Independent sellers · One marketplace
          </motion.p>

          <motion.h1
            variants={rise}
            transition={spring.ui}
            className="text-display mt-8 max-w-[15ch]"
          >
            A marketplace built by many hands
          </motion.h1>

          <div className="mt-12 grid gap-10 border-t border-[var(--border)] pt-10 md:grid-cols-[1fr_auto] md:items-end">
            <motion.p
              variants={rise}
              transition={spring.ui}
              className="max-w-md text-[17px] leading-relaxed text-[var(--ink-muted)]"
            >
              Independent sellers list what they make. You find it, buy it, and
              it ships. No opaque ranking deciding who gets seen.
            </motion.p>

            <motion.div
              variants={rise}
              transition={spring.ui}
              className="flex flex-wrap items-center gap-3"
            >
              <Link to="/register">
                <Button size="lg">
                  Start shopping
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="secondary">
                  <Store className="h-4 w-4" />
                  Sell on HiveMind
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section className="shell">
        <div className="grid grid-cols-2 border-t border-[var(--border)] md:grid-cols-4">
          {stats.map((stat, i) => (
            <ScrollReveal
              key={stat.label}
              delay={i * 0.05}
              className="border-b border-[var(--border)] py-9 not-last:border-r"
            >
              <div className="tnum text-4xl font-medium">{stat.value}</div>
              <div className="mt-2 text-[13px] text-[var(--ink-muted)]">
                {stat.label}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="benefits" className="shell py-24 sm:py-32">
        <ScrollReveal>
          <p className="text-eyebrow text-[var(--ink-subtle)]">Why HiveMind</p>
          <h2 className="text-section mt-5 max-w-[18ch]">
            The boring parts, done properly
          </h2>
        </ScrollReveal>

        <div className="mt-16 grid gap-px bg-[var(--border)] md:grid-cols-3">
          {benefits.map((benefit, i) => (
            <ScrollReveal key={benefit.title} delay={i * 0.08}>
              <div className="h-full bg-[var(--canvas)] p-8 sm:p-10">
                <span className="tnum text-sm text-[var(--accent)]">
                  {benefit.n}
                </span>
                <h3 className="text-title mt-6 text-xl font-medium">
                  {benefit.title}
                </h3>
                <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-muted)]">
                  {benefit.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section
        id="how"
        className="border-y border-[var(--border)] bg-[var(--sunken)]"
      >
        <div className="shell py-24 sm:py-32">
          <ScrollReveal>
            <p className="text-eyebrow text-[var(--ink-subtle)]">How it works</p>
            <h2 className="text-section mt-5">Three steps, no surprises</h2>
          </ScrollReveal>

          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {steps.map((step, i) => (
              <ScrollReveal key={step.n} delay={i * 0.08}>
                <div className="border-t border-[var(--border-strong)] pt-6">
                  <span className="tnum text-sm text-[var(--accent)]">
                    {step.n}
                  </span>
                  <h3 className="font-display mt-4 text-2xl">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-muted)]">
                    {step.body}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="trust" className="shell py-24 sm:py-32">
        <ScrollReveal>
          <p className="text-eyebrow text-[var(--ink-subtle)]">Trust</p>
          <h2 className="text-section mt-5">Reasonable questions</h2>
        </ScrollReveal>

        <dl className="mt-14 border-t border-[var(--border)]">
          {objections.map((item, i) => (
            <ScrollReveal key={item.q} delay={i * 0.06}>
              <div className="grid gap-3 border-b border-[var(--border)] py-9 md:grid-cols-[22rem_1fr] md:gap-12">
                <dt className="font-display text-xl">{item.q}</dt>
                <dd className="max-w-xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
                  {item.a}
                </dd>
              </div>
            </ScrollReveal>
          ))}
        </dl>
      </section>

      <section className="shell pb-24 sm:pb-32">
        <ScrollReveal>
          <div className="rounded-[var(--radius-lg)] bg-[var(--ink)] px-6 py-16 text-center sm:px-16 sm:py-24">
            <h2 className="text-section mx-auto max-w-[16ch] text-[var(--canvas)]">
              Buy something, or sell something
            </h2>
            <p className="mx-auto mt-5 max-w-sm text-[15px] text-[var(--ink-subtle)]">
              One account. Pick a side when you sign up.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/register">
                <Button size="lg">
                  Create an account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link
                to="/login"
                className="inline-flex h-12 items-center rounded-full border border-[var(--border-strong)] px-6 text-[15px] font-medium text-[var(--canvas)] transition-colors hover:border-[var(--canvas)]"
              >
                I already have one
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
