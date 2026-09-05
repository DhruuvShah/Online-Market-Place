import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddressPicker } from "./AddressPicker";
import { NEW_ADDRESS } from "@/features/checkout/address";
import type { Address } from "@/types";

const address = (overrides: Partial<Address> = {}): Address => ({
  _id: "a1",
  street: "12 Linking Road",
  city: "Mumbai",
  state: "Maharashtra",
  zip: "400050",
  country: "India",
  isDefault: false,
  ...overrides,
});

describe("AddressPicker", () => {
  it("offers each saved address as a radio option", () => {
    render(
      <AddressPicker
        addresses={[
          address({ _id: "a1", city: "Mumbai" }),
          address({ _id: "a2", city: "Pune" }),
        ]}
        selectedId="a1"
        onSelect={vi.fn()}
      />,
    );

    // Two saved plus the "deliver somewhere else" escape hatch.
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("marks the selected address as checked", () => {
    render(
      <AddressPicker
        addresses={[address({ _id: "a1" }), address({ _id: "a2" })]}
        selectedId="a2"
        onSelect={vi.fn()}
      />,
    );

    const [first, second] = screen.getAllByRole("radio");
    expect(first).not.toBeChecked();
    expect(second).toBeChecked();
  });

  it("reports the chosen address", async () => {
    const onSelect = vi.fn();
    render(
      <AddressPicker
        addresses={[address({ _id: "a1" }), address({ _id: "a2", city: "Pune" })]}
        selectedId="a1"
        onSelect={onSelect}
      />,
    );

    const [, second] = screen.getAllByRole("radio");
    await userEvent.click(second);

    expect(onSelect).toHaveBeenCalledWith("a2");
  });

  it("lets the shopper opt out and type a new address", async () => {
    const onSelect = vi.fn();
    render(
      <AddressPicker
        addresses={[address()]}
        selectedId="a1"
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByText("Deliver somewhere else"));

    expect(onSelect).toHaveBeenCalledWith(NEW_ADDRESS);
  });

  it("shows the full address so it can be checked before paying", () => {
    render(
      <AddressPicker
        addresses={[address()]}
        selectedId="a1"
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/12 Linking Road, Mumbai, Maharashtra 400050, India/),
    ).toBeInTheDocument();
  });

  it("labels the default address", () => {
    render(
      <AddressPicker
        addresses={[address({ isDefault: true })]}
        selectedId="a1"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("renders nothing at all when there is no saved address", () => {
    const { container } = render(
      <AddressPicker addresses={[]} selectedId={NEW_ADDRESS} onSelect={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
