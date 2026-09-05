import { Link } from "react-router-dom";
import { ImageOff } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { useOrderItemImages } from "@/features/orders/hooks/useOrderItemImages";
import type { OrderItem } from "@/types";

export function OrderItemThumb({
  item,
  fallback,
  className = "h-14 w-14",
}: {
  item: OrderItem;
  fallback?: string;
  className?: string;
}) {
  const src = item.image ?? fallback;

  return (
    <div
      className={`bg-sunken shrink-0 overflow-hidden rounded-sm ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt={item.title ?? ""}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="text-ink-subtle grid h-full place-items-center">
          <ImageOff className="h-4 w-4" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

/**
 * Orders placed before the item snapshot existed carry no title, so the row
 * falls back to a link rather than rendering an empty line.
 */
export function OrderItemList({
  items,
  linkToProduct = true,
}: {
  items: OrderItem[];
  linkToProduct?: boolean;
}) {
  const fallbacks = useOrderItemImages(items);

  return (
    <ul className="divide-line border-line divide-y border-y">
      {items.map((item, index) => {
        const lineTotal = item.price.amount * item.quantity;

        const name = item.title ? (
          <span className="text-title text-[15px] font-medium">
            {item.title}
          </span>
        ) : (
          <span className="text-ink-muted text-[15px]">
            Product no longer listed
          </span>
        );

        return (
          <li
            key={item._id ?? `${item.product}-${index}`}
            className="flex items-center gap-4 py-4"
          >
            <OrderItemThumb item={item} fallback={fallbacks[item.product]} />

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {linkToProduct && item.title ? (
                <Link
                  to={`/products/${item.product}`}
                  className="hover:text-accent truncate transition-colors"
                >
                  {name}
                </Link>
              ) : (
                <span className="truncate">{name}</span>
              )}

              <span className="tnum text-ink-muted text-[13px]">
                {item.quantity} × {formatMoney(item.price.amount, item.price.currency)}
              </span>
            </div>

            <span className="tnum shrink-0 text-[15px]">
              {formatMoney(lineTotal, item.price.currency)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Compact stack of overlapping thumbnails for an order summary row. */
export function OrderItemStack({
  items,
  max = 4,
}: {
  items: OrderItem[];
  max?: number;
}) {
  const fallbacks = useOrderItemImages(items);
  const shown = items.slice(0, max);
  const overflow = items.length - shown.length;

  return (
    <div className="flex items-center -space-x-2.5">
      {shown.map((item, index) => (
        <div
          key={item._id ?? `${item.product}-${index}`}
          className="ring-canvas rounded-sm ring-2"
        >
          <OrderItemThumb
            item={item}
            fallback={fallbacks[item.product]}
            className="h-11 w-11"
          />
        </div>
      ))}

      {overflow > 0 && (
        <span className="bg-sunken text-ink-muted ring-canvas tnum grid h-11 w-11 place-items-center rounded-sm text-[12px] ring-2">
          +{overflow}
        </span>
      )}
    </div>
  );
}
