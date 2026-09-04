import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ImageOff, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import {
  useCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from "@/services/cart.api";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/hooks/useToast";
import { formatMoney, formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import { spring } from "@/components/motion/springs";
import type { CartLine } from "@/types";

function Line({ line }: { line: CartLine }) {
  const { notify } = useToast();
  const [updateItem, { isLoading: isUpdating }] = useUpdateCartItemMutation();
  const [removeItem, { isLoading: isRemoving }] = useRemoveCartItemMutation();

  const unavailable = line.price === null;
  const max = line.stock ?? 99;
  const busy = isUpdating || isRemoving;

  const setQuantity = async (qty: number) => {
    try {
      await updateItem({ productId: line.productId, qty }).unwrap();
    } catch (error) {
      notify(getErrorMessage(error, "Could not update quantity"), "error");
    }
  };

  const remove = async () => {
    try {
      await removeItem(line.productId).unwrap();
      notify("Removed from cart");
    } catch (error) {
      notify(getErrorMessage(error, "Could not remove item"), "error");
    }
  };

  return (
    <div className="flex gap-4 py-6 sm:gap-5">
      <Link
        to={`/products/${line.productId}`}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-sunken sm:h-24 sm:w-24"
      >
        {line.image ? (
          <img src={line.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-ink-subtle">
            <ImageOff className="h-5 w-5" strokeWidth={1.5} />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-4">
          <Link
            to={`/products/${line.productId}`}
            className="text-title text-[15px] font-medium hover:text-accent"
          >
            {line.title ?? "Product unavailable"}
          </Link>
          <span className="tnum shrink-0 text-[15px]">
            {line.lineTotal === null ? "—" : formatMoney(line.lineTotal)}
          </span>
        </div>

        {unavailable ? (
          <Badge tone="danger">No longer available</Badge>
        ) : (
          <span className="text-[13px] text-ink-muted">
            {formatPrice(line.price)} each
          </span>
        )}

        {line.stock !== null && line.stock < line.quantity && (
          <Badge tone="warn">Only {line.stock} left</Badge>
        )}

        <div className="mt-1 flex items-center gap-3">
          <div className="inline-flex items-center rounded-full border border-line-strong">
            <button
              onClick={() => void setQuantity(line.quantity - 1)}
              disabled={busy || line.quantity <= 1 || unavailable}
              aria-label="Decrease quantity"
              className="grid h-8 w-8 place-items-center rounded-l-full transition-colors hover:bg-sunken disabled:opacity-40"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="tnum w-8 text-center text-[14px]">
              {line.quantity}
            </span>
            <button
              onClick={() => void setQuantity(line.quantity + 1)}
              disabled={busy || line.quantity >= max || unavailable}
              aria-label="Increase quantity"
              className="grid h-8 w-8 place-items-center rounded-r-full transition-colors hover:bg-sunken disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <button
            onClick={() => void remove()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-muted transition-colors hover:text-accent disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Cart() {
  const { data, isLoading } = useCartQuery();
  const reduced = useReducedMotion();

  if (isLoading) {
    return (
      <div className="shell py-12 sm:py-16">
        <Skeleton className="h-10 w-40" />
        <div className="mt-10 flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const lines = data?.cart.items ?? [];
  const totals = data?.totals;

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart className="h-8 w-8" strokeWidth={1.5} />}
        title="Your cart is empty"
        body="Nothing here yet. Browse the catalog and add something you like."
        action={
          <Link to="/discover">
            <Button>Browse the catalog</Button>
          </Link>
        }
      />
    );
  }

  const hasUnavailable = lines.some((line) => line.price === null);

  return (
    <div className="shell py-12 sm:py-16">
      <p className="text-eyebrow text-ink-subtle">Cart</p>
      <h1 className="text-section mt-4">
        {totals?.totalQuantity} {totals?.totalQuantity === 1 ? "item" : "items"}
      </h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
        <div className="divide-y divide-line border-y border-line">
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <motion.div
                key={line.productId}
                layout={!reduced}
                exit={
                  reduced
                    ? { opacity: 0 }
                    : { opacity: 0, height: 0, overflow: "hidden" }
                }
                transition={spring.ui}
              >
                <Line line={line} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md border border-line bg-raised p-6">
            <h2 className="text-title font-medium">Summary</h2>

            <dl className="mt-5 flex flex-col gap-3 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="tnum">
                  {formatMoney(totals?.subtotal ?? 0, totals?.currency)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd className="text-ink-muted">At checkout</dd>
              </div>
            </dl>

            <div className="mt-5 flex justify-between border-t border-line pt-5">
              <span className="font-medium">Total</span>
              <span className="tnum text-lg">
                {formatMoney(totals?.subtotal ?? 0, totals?.currency)}
              </span>
            </div>

            <Link to="/checkout" className="mt-6 block">
              <Button size="lg" className="w-full" disabled={hasUnavailable}>
                Checkout
              </Button>
            </Link>

            {hasUnavailable && (
              <p className="mt-3 text-[13px] text-accent">
                Remove unavailable items to continue.
              </p>
            )}

            <p className="mt-4 text-[12px] leading-relaxed text-ink-subtle">
              Stock is reserved when you place the order, not now.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
