import { useState } from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { useMyOrdersQuery } from "@/services/order.api";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatMoney } from "@/lib/format";

const PAGE_SIZE = 10;

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
      <p className="text-eyebrow text-[var(--ink-subtle)]">History</p>
      <h1 className="text-section mt-4">Your orders</h1>
      <p className="mt-3 text-[14px] text-[var(--ink-muted)]">
        {total} {total === 1 ? "order" : "orders"}
      </p>

      <ul className="mt-10 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {orders.map((order) => (
          <li key={order._id}>
            <Link
              to={`/orders/${order._id}`}
              className="flex flex-col gap-3 py-5 transition-colors hover:bg-[var(--raised)] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-2"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="tnum text-[14px] font-medium">
                  {order._id.slice(-12).toUpperCase()}
                </span>
                <span className="text-[13px] text-[var(--ink-muted)]">
                  {formatDate(order.createdAt)} ·{" "}
                  {order.items.length}{" "}
                  {order.items.length === 1 ? "item" : "items"}
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
          <span className="tnum text-[13px] text-[var(--ink-muted)]">
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
