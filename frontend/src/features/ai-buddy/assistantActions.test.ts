import { describe, expect, it } from "vitest";
import { tagsForActions } from "./assistantActions";

describe("tagsForActions", () => {
  it("marks the cart stale after the assistant fills it", () => {
    expect(tagsForActions(["addProductToCart"])).toEqual(["Cart"]);
  });

  it("marks nothing stale for a tool that only reads", () => {
    expect(tagsForActions(["searchProduct"])).toEqual([]);
  });

  it("ignores a tool it has never heard of", () => {
    // The service can ship a new tool before the client knows about it, and
    // that should be a no-op rather than a crash.
    expect(tagsForActions(["somethingNew"])).toEqual([]);
  });

  it("does not repeat a tag when several tools share it", () => {
    expect(tagsForActions(["addProductToCart", "addProductToCart"])).toEqual([
      "Cart",
    ]);
  });

  it("keeps the tags it recognises out of a mixed list", () => {
    expect(tagsForActions(["searchProduct", "addProductToCart"])).toEqual([
      "Cart",
    ]);
  });

  it("has nothing to do for an empty turn", () => {
    expect(tagsForActions([])).toEqual([]);
  });
});
