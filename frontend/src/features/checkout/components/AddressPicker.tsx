import { Check, MapPin, Plus } from "lucide-react";
import { NEW_ADDRESS } from "@/features/checkout/address";
import type { Address } from "@/types";

export function AddressPicker({
  addresses,
  selectedId,
  onSelect,
}: {
  addresses: Address[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (addresses.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Choose a delivery address</legend>

      {addresses.map((address) => {
        const active = selectedId === address._id;

        return (
          <label
            key={address._id}
            className={`flex cursor-pointer items-start gap-3.5 rounded-md border p-4 transition-colors ${
              active
                ? "border-ink bg-raised"
                : "border-line hover:border-line-strong"
            }`}
          >
            <input
              type="radio"
              name="shipping-address"
              value={address._id}
              checked={active}
              onChange={() => onSelect(address._id)}
              className="sr-only"
            />

            <span
              aria-hidden
              className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border ${
                active ? "border-ink bg-ink text-canvas" : "border-line-strong"
              }`}
            >
              {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>

            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-2 text-[14px] font-medium">
                <MapPin className="text-ink-subtle h-3.5 w-3.5" strokeWidth={1.75} />
                {address.city}
                {address.isDefault && (
                  <span className="text-eyebrow text-ink-subtle">Default</span>
                )}
              </span>
              <span className="text-ink-muted text-[13px] leading-relaxed">
                {address.street}, {address.city}, {address.state} {address.zip},{" "}
                {address.country}
              </span>
            </span>
          </label>
        );
      })}

      <label
        className={`flex cursor-pointer items-center gap-3.5 rounded-md border border-dashed p-4 text-[14px] transition-colors ${
          selectedId === NEW_ADDRESS
            ? "border-ink bg-raised"
            : "border-line-strong text-ink-muted hover:border-ink hover:text-ink"
        }`}
      >
        <input
          type="radio"
          name="shipping-address"
          value={NEW_ADDRESS}
          checked={selectedId === NEW_ADDRESS}
          onChange={() => onSelect(NEW_ADDRESS)}
          className="sr-only"
        />
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Deliver somewhere else
      </label>
    </fieldset>
  );
}
