import { useState } from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { useMyOrdersQuery } from "@/services/order.api";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { OrderItemStack } from "@/features/orders/components/OrderItemList";
import type { OrderItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatMoney } from "@/lib/format";

const PAGE_SIZE = 10;

/** "Aeron Chair and 2 more" reads better in a list than a bare order number. */
function summarise(items: OrderItem[]) {
  const first = items[0]?.title;
  if (!first) {
    return `${items.length} ${items.length === 1 ? "item" : "items"}`;
  }

  const rest = items.length - 1;
  return rest > 0 ? `${first} and ${rest} more` : first;
}

export default function Orders() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyOrdersQuery({ page, limit: PAGE_SIZE });

  if (isLoading) {
    return (
      <div className="shell py-12 sm:py-16">
        <Skeleton className="h-10 w-40" />
        <div className="mt-10 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const orders = data?.orders ?? [];
  const total = data?.meta.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (orders.length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-8 w-8" strokeWidth={1.5} />}
        title="No orders yet"
        body="Once you place an order it will appear here with its status and full history."
        action={
          <Link to="/discover">
            <Button>Browse the catalog</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="shell py-12 sm:py-16">
      <p className="text-eyebrow text-ink-subtle">History</p>
      <h1 className="text-section mt-4">Your orders</h1>
      <p className="mt-3 text-[14px] text-ink-muted">
        {total} {total === 1 ? "order" : "orders"}
      </p>

      <ul className="mt-10 divide-y divide-line border-y border-line">
        {orders.map((order) => (
          <li key={order._id}>
            <Link
              to={`/orders/${order._id}`}
              className="hover:bg-raised flex flex-col gap-4 py-5 transition-colors sm:flex-row sm:items-center sm:gap-6 sm:px-2"
            >
              <OrderItemStack items={order.items} />

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-title truncate text-[15px] font-medium">
                  {summarise(order.items)}
                </span>
                <span className="text-ink-muted text-[13px]">
                  <span className="tnum">
                    {order._id.slice(-8).toUpperCase()}
                  </span>{" "}
                  · {formatDate(order.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-5 sm:justify-end">
                <OrderStatusBadge status={order.status} />
                <span className="tnum text-[15px]">
                  {formatMoney(
                    order.totalPrice.amount,
                    order.totalPrice.currency,
                  )}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {lastPage > 1 && (
        <div className="mt-10 flex items-center justify-between">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="tnum text-[13px] text-ink-muted">
            Page {page} of {lastPage}
          </span>
          <Button
            variant="secondary"
            disabled={page >= lastPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
