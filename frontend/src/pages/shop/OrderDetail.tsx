import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PackageX } from "lucide-react";
import { useCancelOrderMutation, useOrderQuery } from "@/services/order.api";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { OrderItemList } from "@/features/orders/components/OrderItemList";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/useToast";
import { formatDate, formatMoney } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import type { OrderStatus } from "@/types";

const timeline: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
];

const timelineLabels: Record<string, string> = {
  PENDING: "Placed",
  CONFIRMED: "Paid",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
};

export default function OrderDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { data: order, isLoading, isError } = useOrderQuery(id);
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();

  if (isLoading) {
    return (
      <div className="shell py-12">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="mt-8 h-48 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <EmptyState
        icon={<PackageX className="h-8 w-8" strokeWidth={1.5} />}
        title="Order not found"
        body="This order does not exist, or it belongs to another account."
        action={
          <Link to="/orders">
            <Button>Back to orders</Button>
          </Link>
        }
      />
    );
  }

  const cancelled = order.status === "CANCELLED";
  const canCancel = order.status === "PENDING" || order.status === "CONFIRMED";
  const currentStep = timeline.indexOf(order.status);

  const cancel = async () => {
    try {
      await cancelOrder(order._id).unwrap();
      notify("Order cancelled");
    } catch (error) {
      notify(getErrorMessage(error, "Could not cancel this order"), "error");
    }
  };

  return (
    <div className="shell py-12 sm:py-16">
      <button
        onClick={() => void navigate("/orders")}
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Orders
      </button>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="tnum text-2xl font-medium">
            {order._id.slice(-12).toUpperCase()}
          </h1>
          <p className="mt-2 text-[14px] text-ink-muted">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {!cancelled && (
        <ol className="mt-10 grid grid-cols-4 gap-2">
          {timeline.map((stage, index) => {
            const reached = index <= currentStep;
            return (
              <li key={stage} className="flex flex-col gap-2.5">
                <span
                  className={`h-1 rounded-full ${
                    reached ? "bg-accent" : "bg-line"
                  }`}
                />
                <span
                  className={`text-[12px] ${
                    reached ? "text-ink" : "text-ink-subtle"
                  }`}
                >
                  {timelineLabels[stage]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_20rem] lg:gap-16">
        <div>
          <h2 className="text-title text-lg font-medium">
            Items{" "}
            <span className="text-ink-subtle tnum text-[15px] font-normal">
              ({order.items.length})
            </span>
          </h2>
          <div className="mt-4">
            <OrderItemList items={order.items} />
          </div>

          {order.shippingAddress && (
            <>
              <h2 className="text-title mt-10 text-lg font-medium">
                Shipping address
              </h2>
              <address className="mt-3 text-[14px] not-italic leading-relaxed text-ink-muted">
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.zip}
                <br />
                {order.shippingAddress.country}
              </address>
            </>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md border border-line bg-raised p-6">
            <div className="flex justify-between">
              <span className="font-medium">Total</span>
              <span className="tnum text-lg">
                {formatMoney(
                  order.totalPrice.amount,
                  order.totalPrice.currency,
                )}
              </span>
            </div>

            {canCancel && (
              <Button
                variant="secondary"
                onClick={() => void cancel()}
                disabled={isCancelling}
                className="mt-6 w-full"
              >
                {isCancelling && <Spinner />}
                Cancel order
              </Button>
            )}

            {cancelled && (
              <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
                This order was cancelled and its stock returned to the catalog.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
