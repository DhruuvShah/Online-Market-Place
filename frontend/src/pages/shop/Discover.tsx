import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SearchX, X } from "lucide-react";
import { useProductsQuery } from "@/services/product.api";
import { ProductCard } from "@/features/products/components/ProductCard";
import { Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useDebounced } from "@/hooks/useDebounced";

const PAGE_SIZE = 12;
const PROBE = PAGE_SIZE + 1;

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const [term, setTerm] = useState(params.get("q") ?? "");
  const [minPrice, setMinPrice] = useState(params.get("minprice") ?? "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxprice") ?? "");
  const [page, setPage] = useState(0);

  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(0);
  };

  const debouncedTerm = useDebounced(term, 350);
  const debouncedMin = useDebounced(minPrice, 500);
  const debouncedMax = useDebounced(maxPrice, 500);

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedTerm) next.set("q", debouncedTerm);
    if (debouncedMin) next.set("minprice", debouncedMin);
    if (debouncedMax) next.set("maxprice", debouncedMax);
    setParams(next, { replace: true });
  }, [debouncedTerm, debouncedMin, debouncedMax, setParams]);

  const query = useMemo(
    () => ({
      ...(debouncedTerm ? { q: debouncedTerm } : {}),
      ...(debouncedMin ? { minprice: Number(debouncedMin) } : {}),
      ...(debouncedMax ? { maxprice: Number(debouncedMax) } : {}),
      skip: page * PAGE_SIZE,
      limit: PROBE,
    }),
    [debouncedTerm, debouncedMin, debouncedMax, page],
  );

  const { data, isFetching, isLoading } = useProductsQuery(query);

  const fetched = data ?? [];
  const results = fetched.slice(0, PAGE_SIZE);
  const hasNextPage = fetched.length > PAGE_SIZE;

  const activeFilters = [
    debouncedTerm && { key: "q", label: `“${debouncedTerm}”`, clear: () => setTerm("") },
    debouncedMin && {
      key: "min",
      label: `Min ₹${debouncedMin}`,
      clear: () => setMinPrice(""),
    },
    debouncedMax && {
      key: "max",
      label: `Max ₹${debouncedMax}`,
      clear: () => setMaxPrice(""),
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const hasFilters = activeFilters.length > 0;

  return (
    <div className="shell py-12 sm:py-16">
      <header>
        <p className="text-eyebrow text-ink-subtle">Catalog</p>
        <h1 className="text-section mt-4">Discover</h1>
      </header>

      <div className="mt-9 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
          <Input
            value={term}
            onChange={(event) => changeFilter(setTerm)(event.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="pl-10"
          />
        </div>
        <Input
          value={minPrice}
          onChange={(event) =>
            changeFilter(setMinPrice)(event.target.value.replace(/\D/g, ""))
          }
          placeholder="Min ₹"
          aria-label="Minimum price"
          inputMode="numeric"
          className="sm:w-28"
        />
        <Input
          value={maxPrice}
          onChange={(event) =>
            changeFilter(setMaxPrice)(event.target.value.replace(/\D/g, ""))
          }
          placeholder="Max ₹"
          aria-label="Maximum price"
          inputMode="numeric"
          className="sm:w-28"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {activeFilters.map((filter) => (
          <button
            key={filter.key}
            onClick={filter.clear}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong py-1 pr-2 pl-3 text-[13px] transition-colors hover:border-ink"
          >
            {filter.label}
            <X className="h-3 w-3" />
          </button>
        ))}

        <p className="text-[13px] text-ink-muted">
          {isLoading
            ? "Searching…"
            : `${results.length} ${results.length === 1 ? "product" : "products"}${
                isFetching ? " · updating" : ""
              }`}
        </p>
      </div>

      {isLoading ? (
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3.5">
              <Skeleton className="aspect-square rounded-md" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : results.length === 0 && page > 0 ? (
        <div className="mt-16 flex flex-col items-center gap-6 text-center">
          <p className="text-ink-muted text-[15px]">
            You have reached the end of the catalog.
          </p>
          <Button variant="secondary" onClick={() => setPage(0)}>
            Back to the first page
          </Button>
        </div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-8 w-8" strokeWidth={1.5} />}
          title={hasFilters ? "No products match" : "Nothing listed yet"}
          body={
            hasFilters
              ? "Try a broader search, or clear the filters to see everything in the catalog."
              : "Sellers have not listed anything yet. Check back shortly."
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setTerm("");
                  setMinPrice("");
                  setMaxPrice("");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
            {results.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>

          <div className="mt-14 flex items-center justify-between border-t border-line pt-6">
            <Button
              variant="secondary"
              disabled={page === 0 || isFetching}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span className="tnum text-[13px] text-ink-muted">
              Page {page + 1}
            </span>
            <Button
              variant="secondary"
              disabled={!hasNextPage || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
