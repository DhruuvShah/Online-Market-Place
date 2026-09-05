import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductPage, ProductQuery } from "@/services/product.api";
import type { OrderItem, Product } from "@/types";

const useProductsQuery = vi.fn();

vi.mock("@/services/product.api", () => ({
  useProductsQuery: (query: ProductQuery, options?: { skip?: boolean }) =>
    useProductsQuery(query, options) as unknown,
}));

const { OrderItemList, OrderItemStack } = await import("./OrderItemList");

const catalogProduct = (id: string, thumbnail: string): Product => ({
  _id: id,
  title: "Later photo",
  description: "",
  price: { amount: 100, currency: "INR" },
  seller: "s1",
  stock: 3,
  images: [{ url: `${thumbnail}-full`, thumbnail, id: "f1" }],
});

const catalogReturns = (products: Product[]) => {
  const page: ProductPage = {
    products,
    meta: { total: products.length, skip: 0, limit: products.length, hasMore: false },
  };
  useProductsQuery.mockReturnValue({ data: page });
};

beforeEach(() => {
  useProductsQuery.mockReset();
  useProductsQuery.mockReturnValue({ data: undefined });
});

const item = (overrides: Partial<OrderItem> = {}): OrderItem => ({
  _id: "i1",
  product: "p1",
  title: "Aeron Chair",
  image: "https://ik.example/chair.jpg",
  quantity: 1,
  price: { amount: 1000, currency: "INR" },
  ...overrides,
});

const renderList = (items: OrderItem[], linkToProduct = true) =>
  render(
    <MemoryRouter>
      <OrderItemList items={items} linkToProduct={linkToProduct} />
    </MemoryRouter>,
  );

describe("OrderItemList", () => {
  it("shows the product image from the order snapshot", () => {
    renderList([item()]);

    expect(screen.getByRole("img", { name: "Aeron Chair" })).toHaveAttribute(
      "src",
      "https://ik.example/chair.jpg",
    );
  });

  it("shows the product name and quantity", () => {
    renderList([item({ quantity: 3 })]);

    expect(screen.getByText("Aeron Chair")).toBeInTheDocument();
    expect(screen.getByText(/3 ×/)).toBeInTheDocument();
  });

  it("multiplies the unit price by the quantity for the line total", () => {
    renderList([item({ quantity: 3, price: { amount: 1000, currency: "INR" } })]);

    // 3 x ₹1,000 = ₹3,000. The unit price is shown separately.
    expect(screen.getByText(/3,000/)).toBeInTheDocument();
  });

  it("links to the product when asked", () => {
    renderList([item()]);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/p1");
  });

  it("does not link on a seller's own order card", () => {
    renderList([item()], false);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("falls back gracefully for an order placed before snapshots existed", () => {
    renderList([item({ title: undefined, image: undefined })]);

    expect(screen.getByText("Product no longer listed")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders every line of a multi-item order", () => {
    renderList([
      item({ _id: "i1", title: "Aeron Chair" }),
      item({ _id: "i2", product: "p2", title: "Hario V60" }),
    ]);

    expect(screen.getByText("Aeron Chair")).toBeInTheDocument();
    expect(screen.getByText("Hario V60")).toBeInTheDocument();
  });
});

describe("OrderItemStack", () => {
  it("shows a thumbnail per item", () => {
    render(
      <OrderItemStack
        items={[item({ _id: "i1" }), item({ _id: "i2", product: "p2" })]}
      />,
    );

    expect(screen.getAllByRole("img")).toHaveLength(2);
  });

  it("collapses the overflow into a count", () => {
    const items = Array.from({ length: 6 }, (_, i) =>
      item({ _id: `i${i}`, product: `p${i}` }),
    );

    render(<OrderItemStack items={items} max={4} />);

    expect(screen.getAllByRole("img")).toHaveLength(4);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("shows no counter when everything fits", () => {
    render(<OrderItemStack items={[item()]} max={4} />);

    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});

describe("photos added after the order was placed", () => {
  it("falls back to the product's current photo when the snapshot has none", () => {
    catalogReturns([catalogProduct("p1", "https://ik/added-later.jpg")]);

    renderList([item({ image: undefined })]);

    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://ik/added-later.jpg",
    );
  });

  it("keeps the snapshot when the order already has one", () => {
    catalogReturns([catalogProduct("p1", "https://ik/added-later.jpg")]);

    renderList([item({ image: "https://ik/at-checkout.jpg" })]);

    // The receipt shows what was bought, not what the listing looks like now.
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://ik/at-checkout.jpg",
    );
  });

  it("asks for nothing when every item already has a photo", () => {
    renderList([item()]);

    expect(useProductsQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );
  });

  it("asks for the missing products in a single batched request", () => {
    renderList([
      item({ _id: "i1", product: "p1", image: undefined }),
      item({ _id: "i2", product: "p2", image: undefined }),
      item({ _id: "i3", product: "p3" }),
    ]);

    expect(useProductsQuery).toHaveBeenCalledWith(
      { ids: "p1,p2" },
      expect.objectContaining({ skip: false }),
    );
  });

  it("still shows a placeholder when the product has no photo either", () => {
    catalogReturns([]);

    renderList([item({ image: undefined })]);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("applies the same fallback to the compact stack", () => {
    catalogReturns([catalogProduct("p1", "https://ik/added-later.jpg")]);

    render(<OrderItemStack items={[item({ image: undefined })]} />);

    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://ik/added-later.jpg",
    );
  });
});
