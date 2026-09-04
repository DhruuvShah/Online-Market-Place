import type { OrderStatus } from "@/types";

export const orderStatusTones = {
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
