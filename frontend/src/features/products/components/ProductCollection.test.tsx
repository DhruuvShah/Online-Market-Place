import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProductCollection } from "./ProductCollection";
import { ViewToggle } from "./ViewToggle";
import type { Product, ProductView } from "@/types";

const product = (overrides: Partial<Product> = {}): Product => ({
  _id: "p1",
  title: "Aeron Chair",
  description: "The ergonomic office chair other chairs are measured against.",
  price: { amount: 128000, currency: "INR" },
  seller: "s1",
  stock: 4,
  images: [
    { url: "https://ik/a.jpg", thumbnail: "https://ik/a-t.jpg", id: "f1" },
  ],
  ...overrides,
});

const renderCollection = (products: Product[], view: ProductView) =>
  render(
    <MemoryRouter>
      <ProductCollection products={products} view={view} />
    </MemoryRouter>,
  );

describe("ProductCollection", () => {
  it.each<ProductView>(["grid", "list", "large"])(
    "shows the title, price and image in %s view",
    (view) => {
      renderCollection([product()], view);

      expect(screen.getByText("Aeron Chair")).toBeInTheDocument();
      expect(screen.getByText(/1,28,000/)).toBeInTheDocument();
      expect(screen.getByRole("img")).toHaveAttribute(
        "src",
        "https://ik/a-t.jpg",
      );
    },
  );

  it.each<ProductView>(["grid", "list", "large"])(
    "links every product to its page in %s view",
    (view) => {
      renderCollection([product()], view);

      expect(screen.getByRole("link")).toHaveAttribute("href", "/products/p1");
    },
  );

  it("shows the description in list and large views only", () => {
    const { unmount } = renderCollection([product()], "grid");
    expect(screen.queryByText(/measured against/)).not.toBeInTheDocument();
    unmount();

    renderCollection([product()], "large");
    expect(screen.getByText(/measured against/)).toBeInTheDocument();
  });

  it("marks a sold-out product in every view", () => {
    renderCollection([product({ stock: 0 })], "grid");

    expect(screen.getByText("Sold out")).toBeInTheDocument();
  });

  it("warns when only a few are left", () => {
    renderCollection([product({ stock: 2 })], "grid");

    expect(screen.getByText("Only 2 left")).toBeInTheDocument();
  });

  it("stays quiet about stock when there is plenty", () => {
    renderCollection([product({ stock: 40 })], "grid");

    expect(screen.queryByText(/left/)).not.toBeInTheDocument();
    expect(screen.queryByText("Sold out")).not.toBeInTheDocument();
  });

  it("falls back to the full-size image when there is no thumbnail", () => {
    renderCollection(
      [product({ images: [{ url: "https://ik/full.jpg", thumbnail: "", id: "f1" }] })],
      "grid",
    );

    expect(screen.getByRole("img")).toHaveAttribute("src", "https://ik/full.jpg");
  });

  it("renders a product with no images without breaking", () => {
    renderCollection([product({ images: [] })], "grid");

    expect(screen.getByText("Aeron Chair")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders every product it is given", () => {
    renderCollection(
      [
        product({ _id: "p1", title: "One" }),
        product({ _id: "p2", title: "Two" }),
        product({ _id: "p3", title: "Three" }),
      ],
      "grid",
    );

    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});

describe("ViewToggle", () => {
  it("offers all three layouts", () => {
    render(<ViewToggle view="grid" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "Grid" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "List" })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Large tiles" }),
    ).toBeInTheDocument();
  });

  it("marks the active layout for assistive tech", () => {
    render(<ViewToggle view="list" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "List" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Grid" })).not.toBeChecked();
  });

  it("reports the layout the reader picked", async () => {
    const onChange = vi.fn();
    render(<ViewToggle view="grid" onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "Large tiles" }));

    expect(onChange).toHaveBeenCalledWith("large");
  });
});
