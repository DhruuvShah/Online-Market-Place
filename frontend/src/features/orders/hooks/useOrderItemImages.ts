import { useMemo } from "react";
import { useProductsQuery } from "@/services/product.api";
import type { OrderItem } from "@/types";

/**
 * Orders snapshot the product photo at checkout, which is what keeps a receipt
 * honest. But a seller who lists without a photo and adds one later leaves
 * every earlier order showing a blank tile — and a blank tile reads as a bug.
 *
 * So: the snapshot still wins wherever it exists, and only the items missing
 * one fall back to the product's current photo. One batched request covers
 * however many items are short.
 */
export function useOrderItemImages(items: OrderItem[]) {
  const missing = useMemo(
    () => [
      ...new Set(
        items.filter((item) => !item.image).map((item) => item.product),
      ),
    ],
    [items],
  );

  const { data } = useProductsQuery(
    { ids: missing.join(",") },
    { skip: missing.length === 0 },
  );

  return useMemo(() => {
    const byProduct: Record<string, string> = {};

    for (const product of data?.products ?? []) {
      const image = product.images?.[0];
      if (image) byProduct[product._id] = image.thumbnail || image.url;
    }

    return byProduct;
  }, [data]);
}
