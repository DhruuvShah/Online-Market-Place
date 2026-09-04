import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ImageOff, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useSellerProductsQuery } from "@/services/seller.api";
import { useDeleteProductMutation } from "@/services/product.api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/useToast";
import { formatPrice, stockLabel } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";

export default function Products() {
  const { data: products, isLoading } = useSellerProductsQuery();
  const [deleteProduct] = useDeleteProductMutation();
  const { notify } = useToast();
  const [term, setTerm] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = products ?? [];
    if (!term.trim()) return list;
    const needle = term.trim().toLowerCase();
    return list.filter((product) =>
      product.title.toLowerCase().includes(needle),
    );
  }, [products, term]);

  if (isLoading) {
    return (
      <div className="shell py-12">
        <Skeleton className="h-10 w-48" />
        <div className="mt-10 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if ((products ?? []).length === 0) {
    return (
      <EmptyState
        icon={<Package className="h-8 w-8" strokeWidth={1.5} />}
        title="No products yet"
        body="Everything you list appears here with its stock level, so you can spot what needs restocking."
        action={
          <Link to="/seller/products/new">
            <Button>List a product</Button>
          </Link>
        }
      />
    );
  }

  const remove = async (id: string, title: string) => {
    setPendingId(id);
    try {
      await deleteProduct(id).unwrap();
      notify(`${title} removed`);
    } catch (error) {
      notify(getErrorMessage(error, "Could not delete this product"), "error");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="shell py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-eyebrow text-ink-subtle">Inventory</p>
          <h1 className="text-section mt-4">Products</h1>
        </div>
        <Link to="/seller/products/new">
          <Button>
            <Plus className="h-4 w-4" />
            New product
          </Button>
        </Link>
      </div>

      <div className="relative mt-9 max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search your products"
          aria-label="Search your products"
          className="pl-10"
        />
      </div>

      <p className="mt-4 text-[13px] text-ink-muted">
        {filtered.length} of {products?.length}{" "}
        {products?.length === 1 ? "product" : "products"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-10 text-[14px] text-ink-muted">
          No products match “{term}”.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {filtered.map((product) => {
            const stock = stockLabel(product.stock);
            const image = product.images?.[0];

            return (
              <li
                key={product._id}
                className="group flex items-center gap-4 py-4"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-sunken">
                  {image ? (
                    <img
                      src={image.thumbnail || image.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-ink-subtle">
                      <ImageOff className="h-4 w-4" strokeWidth={1.5} />
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    to={`/products/${product._id}`}
                    className="text-title truncate text-[15px] font-medium hover:text-accent"
                  >
                    {product.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="tnum text-[13px] text-ink-muted">
                      {formatPrice(product.price)}
                    </span>
                    <Badge
                      tone={
                        stock.tone === "ok"
                          ? "ok"
                          : stock.tone === "warn"
                            ? "warn"
                            : "danger"
                      }
                    >
                      {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                    </Badge>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    to={`/seller/products/${product._id}/edit`}
                    aria-label={`Edit ${product.title}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.75} />
                  </Link>
                  <button
                    onClick={() => void remove(product._id, product.title)}
                    disabled={pendingId === product._id}
                    aria-label={`Delete ${product.title}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-sunken hover:text-accent disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
