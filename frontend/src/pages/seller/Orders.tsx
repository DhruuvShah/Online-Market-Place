import { useMemo, useState } from "react";
import { ReceiptText } from "lucide-react";
import { useSellerOrdersQuery } from "@/services/seller.api";
import {
  OrderStatusBadge,
  orderStatusLabels,
} from "@/features/orders/components/OrderStatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatMoney } from "@/lib/format";
import type { OrderStatus } from "@/types";

const filters: (OrderStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export default function SellerOrders() {
  const { data: orders, isLoading } = useSellerOrdersQuery();
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");

  const visible = useMemo(() => {
    const list = orders ?? [];
    return status === "ALL"
      ? list
      : list.filter((order) => order.status === status);
  }, [orders, status]);

  if (isLoading) {
    return (
      <div className="shell py-12">
        <Skeleton className="h-10 w-48" />
        <div className="mt-10 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if ((orders ?? []).length === 0) {
    return (
      <EmptyState
        icon={<ReceiptText className="h-8 w-8" strokeWidth={1.5} />}
        title="No orders yet"
        body="When someone buys one of your products, the order and the buyer's details appear here."
      />
    );
  }

  return (
    <div className="shell py-12 sm:py-16">
      <p className="text-eyebrow text-[var(--ink-subtle)]">Sales</p>
      <h1 className="text-section mt-4">Orders</h1>

      <div className="mt-8 flex flex-wrap gap-2">
        {filters.map((option) => (
          <button
            key={option}
            onClick={() => setStatus(option)}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
              status === option
                ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--canvas)]"
                : "border-[var(--border-strong)] hover:border-[var(--ink)]"
            }`}
          >
            {option === "ALL" ? "All" : orderStatusLabels[option]}
          </button>
        ))}
      </div>

      <p className="mt-5 text-[13px] text-[var(--ink-muted)]">
        {visible.length} {visible.length === 1 ? "order" : "orders"}
      </p>

      {visible.length === 0 ? (
        <p className="mt-10 text-[14px] text-[var(--ink-muted)]">
          No orders with this status.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {visible.map((order) => {
            const sellerTotal = order.items.reduce(
              (sum, item) => sum + item.price.amount * item.quantity,
              0,
            );

            return (
              <li key={order._id} className="flex flex-col gap-3 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="tnum text-[14px] font-medium">
                      {order._id.slice(-12).toUpperCase()}
                    </span>
                    <span className="text-[13px] text-[var(--ink-muted)]">
                      {formatDate(order.createdAt)}
                      {order.user &&
                        ` · ${order.user.fullName?.firstName ?? order.user.username}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <OrderStatusBadge status={order.status} />
                    <span className="tnum text-[15px]">
                      {formatMoney(sellerTotal, order.totalPrice.currency)}
                    </span>
                  </div>
                </div>

                <ul className="flex flex-col gap-1">
                  {order.items.map((item, index) => (
                    <li
                      key={`${item.product}-${index}`}
                      className="text-[13px] text-[var(--ink-muted)]"
                    >
                      <span className="tnum">×{item.quantity}</span> ·{" "}
                      {formatMoney(item.price.amount, item.price.currency)} each
                    </li>
                  ))}
                </ul>

                {order.shippingAddress && (
                  <address className="text-[13px] not-italic text-[var(--ink-subtle)]">
                    Ships to {order.shippingAddress.city},{" "}
                    {order.shippingAddress.state} {order.shippingAddress.zip}
                  </address>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
