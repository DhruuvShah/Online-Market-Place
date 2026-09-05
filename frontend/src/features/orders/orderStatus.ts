import type { OrderStatus } from "@/types";

export const orderStatusTones = {
  PENDING: "warn",
  CONFIRMED: "ok",
  PACKED: "ok",
  SHIPPED: "ok",
  OUT_FOR_DELIVERY: "ok",
  DELIVERED: "accent",
  CANCELLED: "danger",
} as const;

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
