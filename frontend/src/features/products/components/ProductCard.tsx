import { Link } from "react-router-dom";
import { ImageOff } from "lucide-react";
import type { Product, ProductView } from "@/types";
import { formatPrice, stockLabel } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";

function Thumb({
  product,
  className,
  sizes,
}: {
  product: Product;
  className: string;
  sizes: string;
}) {
  const image = product.images?.[0];

  return (
    <div className={`bg-sunken relative overflow-hidden ${className}`}>
      {image ? (
        <img
          src={image.thumbnail || image.url}
          alt={product.title}
          loading="lazy"
          sizes={sizes}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      ) : (
        <div className="text-ink-subtle grid h-full place-items-center">
          <ImageOff className="h-6 w-6" strokeWidth={1.5} />
        </div>
      )}

      {product.stock <= 0 && (
        <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--color-canvas)_72%,transparent)]">
          <Badge tone="danger">Sold out</Badge>
        </div>
      )}
    </div>
  );
}

export function ProductCard({
  product,
  view = "grid",
}: {
  product: Product;
  view?: ProductView;
}) {
  const stock = stockLabel(product.stock);
  const large = view === "large";

  return (
    <Link
      to={`/products/${product._id}`}
      className="group flex flex-col gap-3.5 focus-visible:outline-none"
    >
      <Thumb
        product={product}
        className={large ? "aspect-4/5 rounded-lg" : "aspect-square rounded-md"}
        sizes={large ? "(max-width: 640px) 100vw, 45vw" : "(max-width: 768px) 50vw, 25vw"}
      />

      <div className="flex items-start justify-between gap-3">
        <h3
          className={`text-title font-medium group-hover:text-accent ${
            large ? "text-lg" : "text-[15px]"
          }`}
        >
          {product.title}
        </h3>
        <span
          className={`tnum shrink-0 ${large ? "text-[17px]" : "text-[15px]"}`}
        >
          {formatPrice(product.price)}
        </span>
      </div>

      {large && product.description && (
        <p className="text-ink-muted line-clamp-2 text-[14px] leading-relaxed">
          {product.description}
        </p>
      )}

      {product.stock > 0 && product.stock <= 5 && (
        <span className="text-honey text-[12px]">{stock.label}</span>
      )}
    </Link>
  );
}

export function ProductRow({ product }: { product: Product }) {
  const stock = stockLabel(product.stock);

  return (
    <Link
      to={`/products/${product._id}`}
      className="group hover:bg-raised -mx-3 flex items-center gap-5 rounded-md px-3 py-4 transition-colors"
    >
      <Thumb
        product={product}
        className="h-20 w-20 shrink-0 rounded-sm sm:h-24 sm:w-24"
        sizes="96px"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h3 className="text-title group-hover:text-accent truncate text-[15px] font-medium">
          {product.title}
        </h3>
        {product.description && (
          <p className="text-ink-muted line-clamp-2 text-[13px] leading-relaxed">
            {product.description}
          </p>
        )}
        {product.stock > 0 && product.stock <= 5 && (
          <span className="text-honey text-[12px]">{stock.label}</span>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className="tnum text-[15px]">{formatPrice(product.price)}</span>
        {product.stock <= 0 && <Badge tone="danger">Sold out</Badge>}
      </div>
    </Link>
  );
}
