import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { useProductsQuery } from "@/services/product.api";
import { ProductCollection } from "@/features/products/components/ProductCollection";
import { ViewToggle } from "@/features/products/components/ViewToggle";
import { useProductView } from "@/features/products/hooks/useProductView";
import { Input, Select } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useDebounced } from "@/hooks/useDebounced";
import type { ProductSort } from "@/types";

const PAGE_SIZE = 12;

const sortOptions: { value: ProductSort; label: string }[] = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "title", label: "Name A–Z" },
];

const isSort = (value: string | null): value is ProductSort =>
  sortOptions.some((option) => option.value === value);

export default function Discover() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useProductView("discover");

  const [term, setTerm] = useState(params.get("q") ?? "");
  const [minPrice, setMinPrice] = useState(params.get("minprice") ?? "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxprice") ?? "");
  const [inStockOnly, setInStockOnly] = useState(params.get("instock") === "true");
  const [sort, setSort] = useState<ProductSort>(() => {
    const requested = params.get("sort");
    return isSort(requested) ? requested : "relevance";
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);

  const debouncedTerm = useDebounced(term, 350);
  const debouncedMin = useDebounced(minPrice, 500);
  const debouncedMax = useDebounced(maxPrice, 500);

  // Any change to what is being asked for sends the reader back to page one;
  // page 4 of the previous result set is meaningless against a new filter.
  const changing =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(0);
    };

  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedTerm) next.set("q", debouncedTerm);
    if (debouncedMin) next.set("minprice", debouncedMin);
    if (debouncedMax) next.set("maxprice", debouncedMax);
    if (inStockOnly) next.set("instock", "true");
    if (sort !== "relevance") next.set("sort", sort);
    setParams(next, { replace: true });
  }, [debouncedTerm, debouncedMin, debouncedMax, inStockOnly, sort, setParams]);

  const query = useMemo(
    () => ({
      ...(debouncedTerm ? { q: debouncedTerm } : {}),
      ...(debouncedMin ? { minprice: Number(debouncedMin) } : {}),
      ...(debouncedMax ? { maxprice: Number(debouncedMax) } : {}),
      ...(inStockOnly ? { instock: "true" as const } : {}),
      // "relevance" is the server's own default and is not a sort it accepts.
      ...(sort === "relevance" ? {} : { sort }),
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    }),
    [debouncedTerm, debouncedMin, debouncedMax, inStockOnly, sort, page],
  );

  const { data, isFetching, isLoading } = useProductsQuery(query);

  const results = data?.products ?? [];
  const total = data?.meta.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const hasNextPage = data?.meta.hasMore ?? false;

  const clearAll = () => {
    setTerm("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setSort("relevance");
    setPage(0);
  };

  const activeFilters = [
    debouncedTerm && {
      key: "q",
      label: `“${debouncedTerm}”`,
      clear: () => changing(setTerm)(""),
    },
    debouncedMin && {
      key: "min",
      label: `Min ₹${debouncedMin}`,
      clear: () => changing(setMinPrice)(""),
    },
    debouncedMax && {
      key: "max",
      label: `Max ₹${debouncedMax}`,
      clear: () => changing(setMaxPrice)(""),
    },
    inStockOnly && {
      key: "instock",
      label: "In stock only",
      clear: () => changing(setInStockOnly)(false),
    },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const hasFilters = activeFilters.length > 0;

  return (
    <div className="shell py-12 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-eyebrow text-ink-subtle">Catalog</p>
          <h1 className="text-section mt-4">Discover</h1>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </header>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-ink-subtle pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <Input
            value={term}
            onChange={(event) => changing(setTerm)(event.target.value)}
            placeholder="Search by name or description"
            aria-label="Search products"
            className="pl-10"
          />
        </div>

        <Select
          value={sort}
          onChange={(event) => changing(setSort)(event.target.value as ProductSort)}
          aria-label="Sort products"
          className="sm:w-52"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Button
          variant="secondary"
          onClick={() => setShowFilters((open) => !open)}
          aria-expanded={showFilters}
          className="h-11 shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="bg-accent text-accent-contrast tnum grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]">
              {activeFilters.length}
            </span>
          )}
        </Button>
      </div>

      {showFilters && (
        <div className="border-line mt-4 grid gap-4 rounded-md border p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Minimum price</span>
            <Input
              value={minPrice}
              onChange={(event) =>
                changing(setMinPrice)(event.target.value.replace(/\D/g, ""))
              }
              placeholder="₹0"
              inputMode="numeric"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">Maximum price</span>
            <Input
              value={maxPrice}
              onChange={(event) =>
                changing(setMaxPrice)(event.target.value.replace(/\D/g, ""))
              }
              placeholder="No limit"
              inputMode="numeric"
            />
          </label>

          <label className="flex h-11 cursor-pointer items-center gap-2.5 text-[14px]">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(event) => changing(setInStockOnly)(event.target.checked)}
              className="accent-accent h-4 w-4"
            />
            In stock only
          </label>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {activeFilters.map((filter) => (
          <button
            key={filter.key}
            onClick={filter.clear}
            className="border-line-strong hover:border-ink inline-flex items-center gap-1.5 rounded-full border py-1 pr-2 pl-3 text-[13px] transition-colors"
          >
            {filter.label}
            <X className="h-3 w-3" />
          </button>
        ))}

        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-ink-muted hover:text-ink text-[13px] underline underline-offset-4 transition-colors"
          >
            Clear all
          </button>
        )}

        <p className="text-ink-muted text-[13px]">
          {isLoading
            ? "Searching…"
            : `${total} ${total === 1 ? "product" : "products"}${
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
              <Button variant="secondary" onClick={clearAll}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mt-10">
            <ProductCollection products={results} view={view} />
          </div>

          {(page > 0 || hasNextPage) && (
            <div className="border-line mt-14 flex items-center justify-between border-t pt-6">
              <Button
                variant="secondary"
                disabled={page === 0 || isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <span className="tnum text-ink-muted text-[13px]">
                Page {page + 1} of {lastPage + 1}
              </span>
              <Button
                variant="secondary"
                disabled={!hasNextPage || isFetching}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
