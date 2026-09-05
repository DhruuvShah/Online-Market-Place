import { ProductCard, ProductRow } from "./ProductCard";
import type { Product, ProductView } from "@/types";

const layouts: Record<ProductView, string> = {
  grid: "grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4",
  large: "grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2",
  list: "divide-line flex flex-col divide-y",
};

/**
 * One renderer for every surface that lists products. Discover and the seller
 * inventory pass the same products and get the same three layouts, so a change
 * to a card is a change everywhere.
 */
export function ProductCollection({
  products,
  view,
}: {
  products: Product[];
  view: ProductView;
}) {
  if (view === "list") {
    return (
      <div className={layouts.list}>
        {products.map((product) => (
          <ProductRow key={product._id} product={product} />
        ))}
      </div>
    );
  }

  return (
    <div className={layouts[view]}>
      {products.map((product) => (
        <ProductCard key={product._id} product={product} view={view} />
      ))}
    </div>
  );
}
