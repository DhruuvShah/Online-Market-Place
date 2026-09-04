import { Badge } from "@/components/ui/Badge";
import type { OrderStatus } from "@/types";

const tones = {
  PENDING: "warn",
  CONFIRMED: "ok",
  SHIPPED: "ok",
  DELIVERED: "ok",
  CANCELLED: "danger",
} as const;

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={tones[status]}>{orderStatusLabels[status]}</Badge>;
}
