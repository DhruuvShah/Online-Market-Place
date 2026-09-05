import { useMemo, useState } from "react";
import { CircleCheck, Mail, MapPin, ReceiptText, Search, User } from "lucide-react";
import { useSellerOrdersQuery } from "@/services/seller.api";
import type { SellerOrder } from "@/services/seller.api";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { OrderItemList } from "@/features/orders/components/OrderItemList";
import { OrderProgress } from "@/features/orders/components/OrderProgress";
import { isInFlight } from "@/features/orders/tracking";
import { orderStatusLabels } from "@/features/orders/orderStatus";
import { Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatMoney } from "@/lib/format";
import type { OrderStatus } from "@/types";

const POLL_MS = 8000;

const filters: (OrderStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const buyerName = (user: SellerOrder["user"]) => {
  if (!user) return "Deleted account";
  const { firstName, lastName } = user.fullName ?? {};
  const full = [firstName, lastName].filter(Boolean).join(" ");
  return full || user.username;
};

const sellerTotal = (order: SellerOrder) =>
  order.items.reduce((sum, item) => sum + item.price.amount * item.quantity, 0);

const unitsIn = (order: SellerOrder) =>
  order.items.reduce((sum, item) => sum + item.quantity, 0);

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-eyebrow text-ink-subtle flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <div className="text-[14px] leading-relaxed">{children}</div>
    </div>
  );
}

/**
 * One card per order, carrying everything needed to pack and post it: who
 * bought it, exactly which of your products and how many, what they paid, and
 * where it goes. Items are already filtered to this seller by the dashboard.
 */
function OrderCard({ order }: { order: SellerOrder }) {
  const address = order.shippingAddress;
  const units = unitsIn(order);

  return (
    <li className="border-line rounded-md border p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="tnum text-[13px] font-medium">
            {order._id.slice(-12).toUpperCase()}
          </span>
          <span className="text-ink-muted text-[13px]">
            {formatDate(order.createdAt)} · {units}{" "}
            {units === 1 ? "unit" : "units"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* A sale is only finished when it lands, so say so plainly. */}
          {order.status === "DELIVERED" && (
            <CircleCheck
              className="text-accent h-5 w-5"
              strokeWidth={1.75}
              aria-label="Delivered"
            />
          )}
          <OrderStatusBadge status={order.status} />
          <span className="tnum text-[17px]">
            {formatMoney(sellerTotal(order), order.totalPrice.currency)}
          </span>
        </div>
      </div>

      <OrderProgress order={order} className="mt-5" />

      <div className="mt-5">
        <OrderItemList items={order.items} linkToProduct={false} />
      </div>

      <div className="border-line mt-6 grid gap-6 border-t pt-6 sm:grid-cols-2">
        <Detail
          icon={<User className="h-3 w-3" strokeWidth={2} />}
          label="Buyer"
        >
          <p className="font-medium">{buyerName(order.user)}</p>
          {order.user?.email && (
            <a
              href={`mailto:${order.user.email}`}
              className="text-ink-muted hover:text-accent mt-1 inline-flex items-center gap-1.5 text-[13px] transition-colors"
            >
              <Mail className="h-3 w-3" strokeWidth={2} />
              {order.user.email}
            </a>
          )}
        </Detail>

        <Detail
          icon={<MapPin className="h-3 w-3" strokeWidth={2} />}
          label="Ship to"
        >
          {address ? (
            <address className="text-ink-muted not-italic">
              {address.street}
              <br />
              {address.city}, {address.state} {address.zip}
              <br />
              {address.country}
            </address>
          ) : (
            <span className="text-ink-subtle">No address on file</span>
          )}
        </Detail>
      </div>
    </li>
  );
}

export default function SellerOrders() {
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [term, setTerm] = useState("");
  const [polling, setPolling] = useState(true);

  const { data: orders, isLoading } = useSellerOrdersQuery(undefined, {
    pollingInterval: polling ? POLL_MS : 0,
    skipPollingIfUnfocused: true,
  });

  // Orders move themselves through fulfilment, so the seller sees each stage
  // land without reloading. Nothing in flight, nothing to poll for.
  const shouldPoll = !orders || orders.some((o) => isInFlight(o.status));
  if (polling !== shouldPoll) setPolling(shouldPoll);

  const visible = useMemo(() => {
    const list = orders ?? [];
    const needle = term.trim().toLowerCase();

    return list.filter((order) => {
      if (status !== "ALL" && order.status !== status) return false;
      if (!needle) return true;

      // Sellers look up an order by whatever they have to hand: the reference
      // from an email, the buyer, or the product they are about to pack.
      const haystack = [
        order._id,
        buyerName(order.user),
        order.user?.email,
        order.shippingAddress?.city,
        ...order.items.map((item) => item.title ?? ""),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [orders, status, term]);

  if (isLoading) {
    return (
      <div className="shell py-12">
        <Skeleton className="h-10 w-48" />
        <div className="mt-10 flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full" />
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

  const revenue = visible.reduce((sum, order) => sum + sellerTotal(order), 0);

  return (
    <div className="shell py-12 sm:py-16">
      <p className="text-eyebrow text-ink-subtle">Sales</p>
      <h1 className="text-section mt-4">Orders</h1>

      <div className="relative mt-8 max-w-md">
        <Search className="text-ink-subtle pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by buyer, product, city or reference"
          aria-label="Search orders"
          className="pl-10"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {filters.map((option) => (
          <button
            key={option}
            onClick={() => setStatus(option)}
            aria-pressed={status === option}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] transition-colors ${
              status === option
                ? "border-ink bg-ink text-canvas"
                : "border-line-strong hover:border-ink"
            }`}
          >
            {option === "ALL" ? "All" : orderStatusLabels[option]}
          </button>
        ))}
      </div>

      <p className="text-ink-muted mt-5 text-[13px]">
        {visible.length} {visible.length === 1 ? "order" : "orders"}
        {visible.length > 0 && (
          <>
            {" · "}
            <span className="tnum">{formatMoney(revenue)}</span> from your items
          </>
        )}
      </p>

      {visible.length === 0 ? (
        <p className="text-ink-muted mt-10 text-[14px]">
          No orders match {term ? `“${term}”` : "this status"}.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {visible.map((order) => (
            <OrderCard key={order._id} order={order} />
          ))}
        </ul>
      )}
    </div>
  );
}
