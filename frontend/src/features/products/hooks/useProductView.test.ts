import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useProductView } from "./useProductView";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useProductView", () => {
  it("starts on the given fallback", () => {
    const { result } = renderHook(() => useProductView("discover"));

    expect(result.current[0]).toBe("grid");
  });

  it("honours a different fallback per surface", () => {
    const { result } = renderHook(() =>
      useProductView("seller-inventory", "list"),
    );

    expect(result.current[0]).toBe("list");
  });

  it("remembers the layout across mounts", () => {
    const first = renderHook(() => useProductView("discover"));
    act(() => first.result.current[1]("large"));
    first.unmount();

    const second = renderHook(() => useProductView("discover"));
    expect(second.result.current[0]).toBe("large");
  });

  it("keeps each surface independent", () => {
    const discover = renderHook(() => useProductView("discover"));
    act(() => discover.result.current[1]("large"));

    const inventory = renderHook(() => useProductView("seller-inventory", "list"));
    expect(inventory.result.current[0]).toBe("list");
  });

  it("ignores a stored value that is not a real layout", () => {
    window.localStorage.setItem("hivemind:view:discover", "carousel");

    const { result } = renderHook(() => useProductView("discover"));

    expect(result.current[0]).toBe("grid");
  });

  it("falls back when storage throws, as it does in a private window", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    const { result } = renderHook(() => useProductView("discover", "list"));

    expect(result.current[0]).toBe("list");
  });

  it("still switches layout when the write throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const { result } = renderHook(() => useProductView("discover"));
    act(() => result.current[1]("list"));

    expect(result.current[0]).toBe("list");
  });
});
