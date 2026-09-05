import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductPage, ProductQuery } from "@/services/product.api";
import type { Product } from "@/types";

const useProductsQuery = vi.fn();

vi.mock("@/services/product.api", () => ({
  useProductsQuery: (query: ProductQuery) => useProductsQuery(query) as unknown,
}));

const { default: Discover } = await import("./Discover");

const product = (id: string): Product => ({
  _id: id,
  title: `Product ${id}`,
  description: "",
  price: { amount: 100, currency: "INR" },
  seller: "s1",
  stock: 5,
  images: [],
});

const page = (overrides: Partial<ProductPage["meta"]> = {}): ProductPage => ({
  products: Array.from({ length: 12 }, (_, i) => product(`p${i}`)),
  meta: { total: 60, skip: 0, limit: 12, hasMore: true, ...overrides },
});

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Discover />
    </MemoryRouter>,
  );

const lastQuery = () =>
  useProductsQuery.mock.calls.at(-1)?.[0] as ProductQuery | undefined;

beforeEach(() => {
  useProductsQuery.mockReset();
  useProductsQuery.mockReturnValue({
    data: page(),
    isFetching: false,
    isLoading: false,
  });
});

describe("Discover pagination", () => {
  it("starts on page one with no page in the url", () => {
    renderAt("/discover");

    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    expect(lastQuery()?.skip).toBe(0);
  });

  it("restores the page from the url on a reload", () => {
    // The reported bug: coming back from a product, or refreshing, dropped the
    // reader back to page one.
    renderAt("/discover?page=3");

    expect(screen.getByText(/Page 3 of/)).toBeInTheDocument();
    expect(lastQuery()?.skip).toBe(24);
  });

  it("restores the filters alongside the page", () => {
    renderAt("/discover?q=chair&minprice=500&instock=true&sort=price_asc&page=2");

    const query = lastQuery();
    expect(query).toMatchObject({
      q: "chair",
      minprice: 500,
      instock: "true",
      sort: "price_asc",
      skip: 12,
    });
  });

  it("ignores a nonsense page rather than asking for a negative offset", () => {
    renderAt("/discover?page=-5");

    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    expect(lastQuery()?.skip).toBe(0);
  });

  it("advances a page when Next is pressed", async () => {
    renderAt("/discover");

    await userEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
    expect(lastQuery()?.skip).toBe(12);
  });

  it("goes back a page when Previous is pressed", async () => {
    renderAt("/discover?page=3");

    await userEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
  });

  it("disables Previous on the first page", () => {
    renderAt("/discover");

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("hides the pager entirely when everything fits on one page", () => {
    useProductsQuery.mockReturnValue({
      data: page({ hasMore: false, total: 12 }),
      isFetching: false,
      isLoading: false,
    });

    renderAt("/discover");

    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("disables Next on the final page of a longer catalog", () => {
    useProductsQuery.mockReturnValue({
      data: page({ hasMore: false, total: 60, skip: 48 }),
      isFetching: false,
      isLoading: false,
    });

    renderAt("/discover?page=5");

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  it("returns to page one when the search changes", async () => {
    renderAt("/discover?page=4");
    expect(screen.getByText(/Page 4 of/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search products"), "chair");

    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
  });

  it("returns to page one when the sort changes", async () => {
    renderAt("/discover?page=4");

    await userEvent.selectOptions(
      screen.getByLabelText("Sort products"),
      "price_asc",
    );

    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
  });
});
