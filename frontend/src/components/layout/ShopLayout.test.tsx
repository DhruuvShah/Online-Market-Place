import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/cart.api", () => ({
  useCartQuery: () => ({ data: { totals: { totalQuantity: 2 } } }),
}));

vi.mock("@/services/auth.api", () => ({
  useLogoutMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/features/ai-buddy/components/AiBuddyDrawer", () => ({
  AiBuddyDrawer: () => null,
}));

const { ShopLayout } = await import("./ShopLayout");

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={["/discover"]}>
      <ShopLayout />
    </MemoryRouter>,
  );

const header = () => document.querySelector("header") as HTMLElement;

/** Accessible names of the header's controls, in document order. */
const headerOrder = () =>
  Array.from(
    header().querySelectorAll<HTMLElement>("nav a, nav button"),
  ).map(
    (element) =>
      element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "",
  );

describe("ShopLayout header", () => {
  it("puts the mark first, then the links, then the controls", () => {
    renderLayout();

    const order = headerOrder();
    const index = (name: string) =>
      order.findIndex((label) => label.startsWith(name));

    expect(index("HiveMind")).toBe(0);
    expect(index("Discover")).toBeGreaterThan(index("HiveMind"));
    expect(index("Orders")).toBeGreaterThan(index("Discover"));
    expect(index("Cart")).toBeGreaterThan(index("Orders"));
    expect(index("Account")).toBeGreaterThan(index("Cart"));
    expect(index("Sign out")).toBeGreaterThan(index("Account"));
  });

  it("ends the bar with sign out, so the controls hold the right edge", () => {
    renderLayout();

    expect(headerOrder().at(-1)).toBe("Sign out");
  });

  it("keeps every control reachable by its accessible name", () => {
    renderLayout();

    const bar = within(header());
    expect(bar.getByLabelText(/^Cart/)).toBeInTheDocument();
    expect(bar.getByLabelText("Account")).toBeInTheDocument();
    expect(bar.getByLabelText("Sign out")).toBeInTheDocument();
    expect(bar.getByLabelText("HiveMind")).toBeInTheDocument();
  });

  it("still links Discover and Orders", () => {
    renderLayout();

    const bar = within(header());
    expect(bar.getByRole("link", { name: "Discover" })).toHaveAttribute(
      "href",
      "/discover",
    );
    expect(bar.getByRole("link", { name: "Orders" })).toHaveAttribute(
      "href",
      "/orders",
    );
  });

  it("shows the cart count", () => {
    renderLayout();

    expect(screen.getByLabelText("Cart, 2 items")).toBeInTheDocument();
  });
});
