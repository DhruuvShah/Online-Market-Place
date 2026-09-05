import type { Address, ShippingAddressInput } from "@/types";

export const NEW_ADDRESS = "new";

export function toShippingInput(address: Address): ShippingAddressInput {
  return {
    street: address.street,
    city: address.city,
    state: address.state,
    pincode: address.zip,
    country: address.country,
  };
}

/**
 * The saved address a returning shopper should land on: their default, else the
 * most recently added one.
 */
export function preferredAddress(addresses: Address[]): Address | undefined {
  return addresses.find((address) => address.isDefault) ?? addresses.at(-1);
}
