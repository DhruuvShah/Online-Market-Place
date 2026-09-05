import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  Boxes,
  Minus,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ScrollReveal } from "@/components/motion/ScrollReveal";
import { spring } from "@/components/motion/springs";

const proof = [
  { value: "Atomic", label: "stock reservation at checkout" },
  { value: "Server", label: "side pricing on every order" },
  { value: "Zero", label: "card details ever stored" },
  { value: "Instant", label: "email receipts, itemised" },
];

const pillars = [
  {
    n: "01",
    icon: Boxes,
    title: "The last one is really the last one",
    body: "Most marketplaces decrement stock after payment clears. That gap is why you get the apologetic email a day later. Here the count moves the moment you check out — so two people can never buy the same final unit, and if you miss it you find out in the checkout, not in your inbox.",
    detail: "Reserved at checkout, released automatically on cancellation.",
  },
  {
    n: "02",
    icon: ShieldCheck,
    title: "Your card never touches us",
    body: "Every total is recalculated on our servers from the seller's own price before a rupee moves, so a tampered page cannot change what you pay. The payment itself happens inside Razorpay, and we verify the signature on the way back before an order is ever marked confirmed.",
    detail: "Razorpay-hosted checkout, signature-verified confirmation.",
  },
  {
    n: "03",
    icon: Sparkles,
    title: "Describe it, do not hunt for it",
    body: "You should not need to guess the exact words a seller happened to use. Tell the assistant what you are after in an ordinary sentence — the material, the room, the budget — and it searches the catalog and can assemble the cart for you.",
    detail: "Built into every page, on the right-hand side.",
  },
  {
    n: "04",
    icon: Truck,
    title: "You always know where it stands",
    body: "Placed, paid, shipped, delivered. Each step is a real state change, not a marketing update — and each one sends you an itemised email with the photos, quantities and the address it is going to.",
    detail: "Cancel a pending order yourself, no support queue.",
  },
];

const steps = [
  {
    n: "01",
    title: "Find it",
    body: "Search by name or description, filter by price and availability, and switch between tiles and a list. Or just ask the assistant.",
  },
  {
    n: "02",
    title: "Reserve it",
    body: "Adding to your cart holds nothing — that is deliberate. Starting checkout is what takes the stock off the shelf and puts it aside for you.",
  },
  {
    n: "03",
    title: "Pay and track",
    body: "Razorpay handles the payment. The order confirms the second it clears, the seller is notified, and your receipt lands with every item on it.",
  },
];

const sellerPoints = [
  "List in under a minute — title, price, stock, up to five photos.",
  "Revenue and stock charted over your last thirty days.",
  "Every order arrives with the buyer, the items and the shipping address.",
  "Delete a photo and it goes from our storage too. No orphans, no bill creep.",
];

const questions = [
  {
    q: "What happens if something sells out while I am paying?",
    a: "It cannot. The stock is already reserved against your order before the payment window opens — that is the whole point of reserving at checkout rather than at confirmation. If the stock was not there, you were told before you reached the payment step.",
  },
  {
    q: "Can a seller change the price after I have ordered?",
    a: "No. Every order stores its own copy of what you bought: the title, the photo and the price at the moment you checked out. A seller can rename a product or reprice it tomorrow and your order and receipt stay exactly as they were.",
  },
  {
    q: "Who am I actually buying from?",
    a: "A registered seller account. Sellers manage their own inventory, see their own orders and are emailed your delivery address so they can post it. Nobody sells anonymously, and nothing is dropshipped through us.",
  },
  {
    q: "How do I cancel?",
    a: "From the order itself, while it is still pending. The stock goes straight back into the catalog for the next person and you get a cancellation email listing what was released. No form, no waiting on a reply.",
  },
  {
    q: "Is it free to sell here?",
    a: "Yes. Create an account as a seller, list what you make, and keep what you charge. There is no ranking to buy your way up — the catalog shows what is there.",
  },
];

function Question({ item, index }: { item: (typeof questions)[number]; index: number }) {
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();

  return (
    <ScrollReveal delay={index * 0.04}>
      <div className="border-line border-b">
        <button
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-6 py-7 text-left"
        >
          <span className="font-display text-lg sm:text-xl">{item.q}</span>
          <span className="border-line-strong text-ink-muted grid h-8 w-8 shrink-0 place-items-center rounded-full border">
            {open ? (
              <Minus className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
          </span>
        </button>

        <motion.div
          initial={false}
          animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
          transition={reduced ? { duration: 0 } : spring.ui}
          className="overflow-hidden"
        >
          <p className="text-ink-muted max-w-2xl pb-7 text-[15px] leading-relaxed">
            {item.a}
          </p>
        </motion.div>
      </div>
    </ScrollReveal>
  );
}

export default function Landing() {
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // A slow counter-drift on the hero. Springing the raw progress keeps it from
  // tracking the scroll wheel step for step, which reads as jitter.
  const drift = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001,
  });
  const heroY = useTransform(drift, [0, 1], [0, reduced ? 0 : 70]);
  const heroFade = useTransform(drift, [0, 0.85], [1, reduced ? 1 : 0.35]);

  const rise = {
    hidden: { opacity: 0, y: reduced ? 0 : 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <section ref={heroRef} className="shell pt-32 pb-16 sm:pt-44 sm:pb-24">
        <motion.div
          style={{ y: heroY, opacity: heroFade }}
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          <motion.p
            variants={rise}
            transition={spring.ui}
            className="text-eyebrow text-ink-subtle"
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

          <div className="border-line mt-12 grid gap-10 border-t pt-10 md:grid-cols-[1fr_auto] md:items-end">
            <motion.p
              variants={rise}
              transition={spring.ui}
              className="text-ink-muted max-w-lg text-[17px] leading-relaxed"
            >
              Chairs, cameras, kettles and keyboards, listed by the people who
              actually stock them. No sponsored rows, no algorithm deciding who
              gets seen, and no stock count that turns out to be optimistic.
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
        <div className="border-line grid grid-cols-2 border-t md:grid-cols-4">
          {proof.map((item, i) => (
            <ScrollReveal
              key={item.label}
              delay={i * 0.05}
              className="border-line rule-cell border-b not-last:border-r"
            >
              <div className="text-stat">{item.value}</div>
              <div className="text-ink-muted mt-2.5 text-[13px] leading-snug">
                {item.label}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="benefits" className="shell py-24 sm:py-32">
        <ScrollReveal>
          <p className="text-eyebrow text-ink-subtle">Why HiveMind</p>
          <h2 className="text-section mt-5 max-w-[20ch]">
            The boring parts, done properly
          </h2>
          <p className="text-ink-muted mt-6 max-w-xl text-[16px] leading-relaxed">
            Nobody chooses a marketplace for its architecture. You notice it
            only when it fails you — the item that was not really in stock, the
            price that moved, the order you could not cancel. So that is what we
            built for.
          </p>
        </ScrollReveal>

        <div className="mt-16 grid gap-px sm:grid-cols-2">
          {pillars.map((pillar, i) => (
            <ScrollReveal key={pillar.title} delay={i * 0.06}>
              <div className="bg-canvas border-line h-full border-t p-8 sm:p-10">
                <div className="flex items-center justify-between">
                  <span className="tnum text-accent text-sm">{pillar.n}</span>
                  <pillar.icon
                    className="text-ink-subtle h-5 w-5"
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-title mt-6 text-xl font-medium">
                  {pillar.title}
                </h3>
                <p className="text-ink-muted mt-4 text-[15px] leading-relaxed">
                  {pillar.body}
                </p>
                <p className="text-ink-subtle border-line mt-5 border-t pt-4 text-[13px]">
                  {pillar.detail}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section id="how" className="border-line bg-sunken border-y">
        <div className="shell py-24 sm:py-32">
          <ScrollReveal>
            <p className="text-eyebrow text-ink-subtle">How it works</p>
            <h2 className="text-section mt-5">Three steps, no surprises</h2>
          </ScrollReveal>

          <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {steps.map((step, i) => (
              <ScrollReveal key={step.n} delay={i * 0.08}>
                <div className="border-line-strong border-t pt-6">
                  <span className="tnum text-accent text-sm">{step.n}</span>
                  <h3 className="font-display mt-4 text-2xl">{step.title}</h3>
                  <p className="text-ink-muted mt-3 text-[15px] leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="sell" className="shell py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <ScrollReveal>
            <p className="text-eyebrow text-ink-subtle">For sellers</p>
            <h2 className="text-section mt-5 max-w-[16ch]">
              Your shelf, your prices, your customers
            </h2>
            <p className="text-ink-muted mt-6 text-[16px] leading-relaxed">
              You keep what you charge. There is no placement to buy, no fee
              taken off the top, and no rule about how you photograph your own
              work. What you get instead is the machinery — stock that stays
              accurate, payments that reconcile, and a buyer's address in your
              inbox the moment an order lands.
            </p>
            <div className="mt-9">
              <Link to="/register">
                <Button size="lg">
                  <Store className="h-4 w-4" />
                  Open a seller account
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.08}>
            <ul className="border-line border-t">
              {sellerPoints.map((point) => (
                <li
                  key={point}
                  className="border-line flex items-start gap-4 border-b py-5"
                >
                  <span className="bg-accent mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span className="text-[15px] leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>
        </div>
      </section>

      <section id="trust" className="shell pb-24 sm:pb-32">
        <ScrollReveal>
          <p className="text-eyebrow text-ink-subtle">Reasonable questions</p>
          <h2 className="text-section mt-5">Before you sign up</h2>
        </ScrollReveal>

        <div className="border-line mt-12 border-t">
          {questions.map((item, i) => (
            <Question key={item.q} item={item} index={i} />
          ))}
        </div>
      </section>

      <section className="shell pb-24 sm:pb-32">
        <ScrollReveal>
          <div className="bg-ink rounded-lg px-6 py-16 text-center sm:px-16 sm:py-24">
            <h2 className="text-section text-canvas mx-auto max-w-[16ch]">
              Buy something, or sell something
            </h2>
            <p className="text-ink-subtle mx-auto mt-5 max-w-sm text-[15px] leading-relaxed">
              One account either way. You pick a side when you sign up, and it
              takes about thirty seconds.
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
                className="border-line-strong text-canvas hover:border-canvas inline-flex h-12 items-center rounded-full border px-6 text-[15px] font-medium transition-colors"
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
