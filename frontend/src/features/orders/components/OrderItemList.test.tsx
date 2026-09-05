import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { OrderItemList, OrderItemStack } from "./OrderItemList";
import type { OrderItem } from "@/types";

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
