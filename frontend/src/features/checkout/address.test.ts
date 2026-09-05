import { describe, expect, it } from "vitest";
import { NEW_ADDRESS, preferredAddress, toShippingInput } from "./address";
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

describe("toShippingInput", () => {
  it("renames zip to the pincode the order service expects", () => {
    expect(toShippingInput(address())).toEqual({
      street: "12 Linking Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      country: "India",
    });
  });

  it("drops the fields an order has no use for", () => {
    const result = toShippingInput(address({ isDefault: true }));

    expect(result).not.toHaveProperty("_id");
    expect(result).not.toHaveProperty("isDefault");
    expect(result).not.toHaveProperty("zip");
  });
});

describe("preferredAddress", () => {
  it("prefers the address marked default", () => {
    const chosen = preferredAddress([
      address({ _id: "a1" }),
      address({ _id: "a2", isDefault: true }),
      address({ _id: "a3" }),
    ]);

    expect(chosen?._id).toBe("a2");
  });

  it("falls back to the most recently added when none is default", () => {
    const chosen = preferredAddress([
      address({ _id: "a1" }),
      address({ _id: "a2" }),
    ]);

    expect(chosen?._id).toBe("a2");
  });

  it("returns nothing for an empty book", () => {
    expect(preferredAddress([])).toBeUndefined();
  });
});

describe("NEW_ADDRESS", () => {
  it("cannot collide with a Mongo object id", () => {
    expect(NEW_ADDRESS).toBe("new");
    expect(NEW_ADDRESS).not.toMatch(/^[a-f\d]{24}$/i);
  });
});
