import { Link } from "react-router-dom";
import { ImageOff } from "lucide-react";
import type { Product } from "@/types";
import { formatPrice, stockLabel } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

export function ProductCard({ product }: { product: Product }) {
  const image = product.images?.[0];
  const stock = stockLabel(product.stock);

  return (
    <Link
      to={`/products/${product._id}`}
      className="group flex flex-col gap-3.5 focus-visible:outline-none"
    >
      <div className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-[var(--sunken)]">
        {image ? (
          <img
            src={image.thumbnail || image.url}
            alt={product.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full place-items-center text-[var(--ink-subtle)]">
            <ImageOff className="h-6 w-6" strokeWidth={1.5} />
          </div>
        )}

        {product.stock <= 0 && (
          <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--canvas)_72%,transparent)]">
            <Badge tone="danger">Sold out</Badge>
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-3">
        <h3 className="text-title text-[15px] font-medium group-hover:text-[var(--accent)]">
          {product.title}
        </h3>
        <span className="tnum shrink-0 text-[15px]">
          {formatPrice(product.price)}
        </span>
      </div>

      {product.stock > 0 && product.stock <= 5 && (
        <span className="text-[12px] text-[var(--honey)]">{stock.label}</span>
      )}
    </Link>
  );
}
