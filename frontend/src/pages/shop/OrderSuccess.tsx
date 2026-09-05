import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { useOrderQuery } from "@/services/order.api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SuccessCheck } from "@/components/motion/SuccessCheck";
import { formatMoney } from "@/lib/format";
import { spring } from "@/components/motion/springs";

const MAX_POLLS = 10;

export default function OrderSuccess() {
  const { id = "" } = useParams();
  const [polls, setPolls] = useState(0);
  const reduced = useReducedMotion();

  const { data: order } = useOrderQuery(id, {
    pollingInterval: polls < MAX_POLLS ? 2000 : 0,
  });

  // Anything past PENDING means the payment cleared. Checking for CONFIRMED
  // alone would read as unconfirmed the moment fulfilment moves it onwards.
  const confirmed = !!order && order.status !== "PENDING" && order.status !== "CANCELLED";

  useEffect(() => {
    if (confirmed || polls >= MAX_POLLS) return;
    const timer = setTimeout(() => setPolls((count) => count + 1), 2000);
    return () => clearTimeout(timer);
  }, [confirmed, polls]);

  const stillWaiting = !confirmed && polls < MAX_POLLS;

  const rise = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { ...spring.ui, delay },
  });

  return (
    <div className="shell flex min-h-[75dvh] flex-col items-center justify-center py-16 text-center">
      <SuccessCheck />

      <motion.h1 {...rise(0.7)} className="font-display mt-8 text-4xl">
        Order placed
      </motion.h1>

      <motion.p
        {...rise(0.8)}
        className="tnum mt-3 text-[14px] text-ink-muted"
      >
        {id.slice(-12).toUpperCase()}
      </motion.p>

      <motion.div {...rise(0.9)} className="mt-6">
        {stillWaiting ? (
          <Badge tone="warn">Confirming your payment…</Badge>
        ) : confirmed ? (
          <Badge tone="ok">Payment confirmed</Badge>
        ) : (
          <Badge tone="muted">Awaiting confirmation</Badge>
        )}
      </motion.div>

      {order && (
        <motion.div
          {...rise(1)}
          className="mt-10 w-full max-w-sm rounded-md border border-line bg-raised p-6 text-left"
        >
          <ul className="flex flex-col gap-3">
            {order.items.map((item, index) => (
              <li
                key={`${item.product}-${index}`}
                className="flex justify-between gap-4 text-[14px]"
              >
                <span className="text-ink-muted">
                  Item ×{item.quantity}
                </span>
                <span className="tnum">
                  {formatMoney(
                    item.price.amount * item.quantity,
                    item.price.currency,
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-line pt-4">
            <span className="font-medium">Total</span>
            <span className="tnum">
              {formatMoney(order.totalPrice.amount, order.totalPrice.currency)}
            </span>
          </div>
        </motion.div>
      )}

      <motion.p
        {...rise(1.1)}
        className="mt-8 max-w-sm text-[13px] leading-relaxed text-ink-subtle"
      >
        {stillWaiting
          ? "Payment confirmation arrives by webhook and can take a few seconds. You can safely leave this page."
          : "A confirmation email is on its way. Follow your order through packing, dispatch and delivery from the tracking page."}
      </motion.p>

      <motion.div {...rise(1.2)} className="mt-9 flex flex-wrap justify-center gap-3">
        <Link to={`/orders/${id}`}>
          <Button size="lg">View order</Button>
        </Link>
        <Link to="/discover">
          <Button size="lg" variant="secondary">
            Keep shopping
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
