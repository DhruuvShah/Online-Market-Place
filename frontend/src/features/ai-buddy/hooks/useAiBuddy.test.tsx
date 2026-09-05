import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { store } from "@/app/store";
import { baseApi } from "@/services/base.api";
import { useAiBuddy } from "./useAiBuddy";

const { handlers, socket } = vi.hoisted(() => {
  const handlers = new Map<string, (payload: unknown) => void>();

  return {
    handlers,
    socket: {
      connected: true,
      on: (event: string, cb: (payload: unknown) => void) => {
        handlers.set(event, cb);
      },
      off: (event: string) => handlers.delete(event),
      emit: () => undefined,
      connect: () => undefined,
    },
  };
});

vi.mock("@/services/aiBuddy.socket", () => ({
  getAiBuddySocket: () => socket,
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>{children}</Provider>
);

/** Fires a server event at the hook the way the socket would. */
const serverSends = (event: string, payload?: unknown) =>
  act(() => {
    handlers.get(event)?.(payload);
  });

beforeEach(() => {
  handlers.clear();
  vi.restoreAllMocks();
});

describe("useAiBuddy", () => {
  it("shows the assistant's reply", () => {
    const { result } = renderHook(() => useAiBuddy(true), { wrapper });

    serverSends("message", "Added a Hario V60 to your cart.");

    expect(result.current.messages.at(-1)).toMatchObject({
      from: "buddy",
      text: "Added a Hario V60 to your cart.",
    });
  });

  it("stops thinking once the reply lands", () => {
    const { result } = renderHook(() => useAiBuddy(true), { wrapper });

    act(() => result.current.send("add the cheapest thing"));
    expect(result.current.isThinking).toBe(true);

    serverSends("message", "Done.");
    expect(result.current.isThinking).toBe(false);
  });

  it("refreshes the cart when the assistant has filled it", () => {
    const dispatch = vi.spyOn(store, "dispatch");
    renderHook(() => useAiBuddy(true), { wrapper });

    serverSends("assistant-actions", ["addProductToCart"]);

    // Without this the drawer says "added it" and the cart page stays empty
    // until the user reloads.
    expect(dispatch).toHaveBeenCalledWith(
      baseApi.util.invalidateTags(["Cart"]),
    );
  });

  it("refreshes nothing when the assistant only looked something up", () => {
    const dispatch = vi.spyOn(store, "dispatch");
    renderHook(() => useAiBuddy(true), { wrapper });

    serverSends("assistant-actions", ["searchProduct"]);

    expect(dispatch).not.toHaveBeenCalledWith(
      baseApi.util.invalidateTags(["Cart"]),
    );
  });

  it("survives an actions event carrying nothing", () => {
    renderHook(() => useAiBuddy(true), { wrapper });

    expect(() => serverSends("assistant-actions", undefined)).not.toThrow();
  });

  it("reports a failed turn instead of thinking for ever", () => {
    const { result } = renderHook(() => useAiBuddy(true), { wrapper });

    act(() => result.current.send("hello"));
    serverSends("assistant-error", "The assistant could not answer that.");

    expect(result.current.isThinking).toBe(false);
    expect(result.current.messages.at(-1)?.text).toBe(
      "The assistant could not answer that.",
    );
  });

  it("does not listen at all while the drawer is closed", () => {
    renderHook(() => useAiBuddy(false), { wrapper });

    expect(handlers.has("assistant-actions")).toBe(false);
  });
});
