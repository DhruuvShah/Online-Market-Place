import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageOff, Minus, Plus } from "lucide-react";
import { useProductQuery } from "@/services/product.api";
import { useAddToCartMutation } from "@/services/cart.api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/useToast";
import { formatPrice, stockLabel } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";

export default function ProductDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { data: product, isLoading, isError } = useProductQuery(id);
  const [addToCart, { isLoading: isAdding }] = useAddToCartMutation();
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);

  if (isLoading) {
    return (
      <div className="shell grid gap-12 py-12 sm:py-16 md:grid-cols-2">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <EmptyState
        icon={<ImageOff className="h-8 w-8" strokeWidth={1.5} />}
        title="Product not found"
        body="This product may have been removed by its seller, or the link is out of date."
        action={
          <Link to="/discover">
            <Button>Back to catalog</Button>
          </Link>
        }
      />
    );
  }

  const stock = stockLabel(product.stock);
  const soldOut = product.stock <= 0;
  const max = Math.max(1, product.stock);
  const images = product.images ?? [];

  const add = async () => {
    try {
      await addToCart({ productId: product._id, qty }).unwrap();
      notify(`${product.title} added to cart`);
    } catch (error) {
      notify(getErrorMessage(error, "Could not add to cart"), "error");
    }
  };

  return (
    <div className="shell py-8 sm:py-12">
      <button
        onClick={() => void navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-14">
        <div className="flex flex-col gap-3">
          <div className="aspect-square overflow-hidden rounded-lg bg-sunken">
            {images[activeImage] ? (
              <img
                src={images[activeImage].url}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-ink-subtle">
                <ImageOff className="h-8 w-8" strokeWidth={1.5} />
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {images.map((image, index) => (
                <button
                  key={image.id || index}
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                  className={`aspect-square overflow-hidden rounded-sm border-2 transition-colors ${
                    index === activeImage
                      ? "border-ink"
                      : "border-transparent hover:border-line-strong"
                  }`}
                >
                  <img
                    src={image.thumbnail || image.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:pt-2">
          <Badge tone={stock.tone === "ok" ? "ok" : stock.tone === "warn" ? "warn" : "danger"}>
            {stock.label}
          </Badge>

          <h1 className="font-display mt-5 text-4xl leading-[1.08]">
            {product.title}
          </h1>

          <p className="tnum mt-5 text-2xl">{formatPrice(product.price)}</p>

          {product.description && (
            <p className="mt-7 max-w-prose text-[15px] leading-relaxed text-ink-muted">
              {product.description}
            </p>
          )}

          <div className="mt-9 border-t border-line pt-7">
            <div className="flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center rounded-full border border-line-strong">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || soldOut}
                  aria-label="Decrease quantity"
                  className="grid h-11 w-11 place-items-center rounded-l-full transition-colors hover:bg-sunken disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="tnum w-10 text-center text-[15px]">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(max, q + 1))}
                  disabled={qty >= max || soldOut}
                  aria-label="Increase quantity"
                  className="grid h-11 w-11 place-items-center rounded-r-full transition-colors hover:bg-sunken disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button
                size="lg"
                onClick={() => void add()}
                disabled={soldOut || isAdding}
                className="flex-1 sm:flex-none sm:px-10"
              >
                {isAdding && <Spinner />}
                {soldOut ? "Sold out" : "Add to cart"}
              </Button>
            </div>

            <p className="mt-5 text-[13px] leading-relaxed text-ink-subtle">
              Adding to cart does not hold stock. It is reserved when you check
              out.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
