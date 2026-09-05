import { useState } from "react";
import { Link } from "react-router-dom";
import { ImageOff, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  useDeleteProductMutation,
  useMyProductsQuery,
} from "@/services/product.api";
import { ViewToggle } from "@/features/products/components/ViewToggle";
import { useProductView } from "@/features/products/hooks/useProductView";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/useToast";
import { useDebounced } from "@/hooks/useDebounced";
import { formatPrice } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import type { Product, ProductView } from "@/types";

type StockFilter = "" | "in" | "low" | "out";

const stockFilters: { value: StockFilter; label: string }[] = [
  { value: "", label: "All stock levels" },
  { value: "in", label: "Well stocked" },
  { value: "low", label: "Running low" },
  { value: "out", label: "Out of stock" },
];

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge tone="danger">Out of stock</Badge>;
  if (stock <= 5) return <Badge tone="warn">{stock} left</Badge>;
  return <Badge tone="ok">{stock} in stock</Badge>;
}

function Thumb({
  product,
  className,
}: {
  product: Product;
  className: string;
}) {
  const image = product.images?.[0];

  return (
    <div className={`bg-sunken shrink-0 overflow-hidden ${className}`}>
      {image ? (
        <img
          src={image.thumbnail || image.url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="text-ink-subtle grid h-full place-items-center">
          <ImageOff className="h-5 w-5" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}

function Actions({
  product,
  onDelete,
  pending,
}: {
  product: Product;
  onDelete: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        to={`/seller/products/${product._id}/edit`}
        aria-label={`Edit ${product.title}`}
        className="text-ink-muted hover:bg-sunken hover:text-ink inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors"
      >
        <Pencil className="h-4 w-4" strokeWidth={1.75} />
      </Link>
      <button
        onClick={onDelete}
        disabled={pending}
        aria-label={`Delete ${product.title}`}
        className="text-ink-muted hover:bg-sunken hover:text-accent inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:opacity-40"
      >
        {pending ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}

/** Inventory rows carry what a seller needs to decide: photo, description,
 *  price and how many are left, in every layout. */
function InventoryItem({
  product,
  view,
  onDelete,
  pending,
}: {
  product: Product;
  view: ProductView;
  onDelete: () => void;
  pending: boolean;
}) {
  const images = product.images?.length ?? 0;

  const meta = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="tnum text-[14px]">{formatPrice(product.price)}</span>
      <StockBadge stock={product.stock} />
      {images === 0 && <Badge tone="warn">No photo</Badge>}
    </div>
  );

  if (view === "list") {
    return (
      <li className="flex items-center gap-4 py-4">
        <Thumb product={product} className="h-16 w-16 rounded-sm" />

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Link
            to={`/seller/products/${product._id}/edit`}
            className="text-title hover:text-accent truncate text-[15px] font-medium"
          >
            {product.title}
          </Link>
          {product.description && (
            <p className="text-ink-muted line-clamp-1 text-[13px]">
              {product.description}
            </p>
          )}
          {meta}
        </div>

        <Actions product={product} onDelete={onDelete} pending={pending} />
      </li>
    );
  }

  const large = view === "large";

  return (
    <li className="border-line flex flex-col gap-4 rounded-md border p-4">
      <Thumb
        product={product}
        className={`w-full rounded-sm ${large ? "aspect-4/3" : "aspect-square"}`}
      />

      <div className="flex flex-1 flex-col gap-2">
        <Link
          to={`/seller/products/${product._id}/edit`}
          className="text-title hover:text-accent text-[15px] font-medium"
        >
          {product.title}
        </Link>

        {large && product.description && (
          <p className="text-ink-muted line-clamp-3 text-[13px] leading-relaxed">
            {product.description}
          </p>
        )}

        {meta}
      </div>

      <div className="border-line flex items-center justify-between border-t pt-3">
        <span className="text-ink-subtle tnum text-[12px]">
          {images} {images === 1 ? "photo" : "photos"}
        </span>
        <Actions product={product} onDelete={onDelete} pending={pending} />
      </div>
    </li>
  );
}

export default function Products() {
  const [view, setView] = useProductView("seller-inventory", "list");
  const [term, setTerm] = useState("");
  const [stock, setStock] = useState<StockFilter>("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const debouncedTerm = useDebounced(term, 300);
  const { notify } = useToast();
  const [deleteProduct] = useDeleteProductMutation();

  // Searching on the server keeps the seller's own catalog authoritative even
  // once it outgrows a single response.
  const { data: products, isLoading, isFetching } = useMyProductsQuery({
    ...(debouncedTerm.trim() ? { q: debouncedTerm.trim() } : {}),
    ...(stock ? { stock } : {}),
  });

  const { data: everything } = useMyProductsQuery();

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

  if (isLoading) {
    return (
      <div className="shell py-12">
        <Skeleton className="h-10 w-48" />
        <div className="mt-10 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const catalogSize = everything?.length ?? 0;
  const results = products ?? [];
  const filtering = Boolean(debouncedTerm.trim() || stock);

  if (catalogSize === 0 && !filtering) {
    return (
      <EmptyState
        icon={<Package className="h-8 w-8" strokeWidth={1.5} />}
        title="No products yet"
        body="Everything you list appears here with its photo, price and stock level, so you can spot what needs restocking."
        action={
          <Link to="/seller/products/new">
            <Button>List a product</Button>
          </Link>
        }
      />
    );
  }

  const layout =
    view === "list"
      ? "divide-line border-line flex flex-col divide-y border-y"
      : view === "large"
        ? "grid gap-5 sm:grid-cols-2"
        : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3";

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

      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-ink-subtle pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search your products by name or description"
            aria-label="Search your products"
            className="pl-10"
          />
        </div>

        <Select
          value={stock}
          onChange={(event) => setStock(event.target.value as StockFilter)}
          aria-label="Filter by stock level"
          className="sm:w-48"
        >
          {stockFilters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <ViewToggle view={view} onChange={setView} />
      </div>

      <p className="text-ink-muted mt-4 text-[13px]">
        {results.length} of {catalogSize}{" "}
        {catalogSize === 1 ? "product" : "products"}
        {isFetching && " · updating"}
      </p>

      {results.length === 0 ? (
        <p className="text-ink-muted mt-10 text-[14px]">
          Nothing matches {debouncedTerm.trim() ? `“${debouncedTerm}”` : "this filter"}.
        </p>
      ) : (
        <ul className={`mt-6 ${layout}`}>
          {results.map((product) => (
            <InventoryItem
              key={product._id}
              product={product}
              view={view}
              pending={pendingId === product._id}
              onDelete={() => void remove(product._id, product.title)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
