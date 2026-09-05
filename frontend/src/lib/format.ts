import type { Currency, Money } from "@/types";

const formatters = new Map<Currency, Intl.NumberFormat>();

function formatterFor(currency: Currency) {
  const existing = formatters.get(currency);
  if (existing) return existing;

  const created = new Intl.NumberFormat(
    currency === "INR" ? "en-IN" : "en-US",
    { style: "currency", currency, maximumFractionDigits: 2 },
  );
  formatters.set(currency, created);
  return created;
}

export function formatMoney(amount: number, currency: Currency = "INR") {
  return formatterFor(currency).format(amount);
}

export function formatPrice(price: Money | null | undefined) {
  if (!price) return "Unavailable";
  return formatMoney(price.amount, price.currency);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Date and time together. Fulfilment stages can land minutes apart, so a bare
 * date would show four identical rows on a tracking timeline.
 */
export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function stockLabel(stock: number | null) {
  if (stock === null) return { label: "Unavailable", tone: "muted" as const };
  if (stock <= 0) return { label: "Out of stock", tone: "danger" as const };
  if (stock <= 5) return { label: `Only ${stock} left`, tone: "warn" as const };
  return { label: "In stock", tone: "ok" as const };
}
