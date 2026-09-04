import { Badge } from "@/components/ui/Badge";
import { orderStatusLabels, orderStatusTones } from "../orderStatus";
import type { OrderStatus } from "@/types";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={orderStatusTones[status]}>{orderStatusLabels[status]}</Badge>;
}
