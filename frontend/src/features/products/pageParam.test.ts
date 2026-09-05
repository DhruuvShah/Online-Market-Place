import { describe, expect, it } from "vitest";
import { pageFromParam, pageToParam } from "./pageParam";

describe("pageFromParam", () => {
  it("reads a 1-based param as a 0-based index", () => {
    expect(pageFromParam("1")).toBe(0);
    expect(pageFromParam("4")).toBe(3);
  });

  it("defaults to the first page when the param is absent", () => {
    expect(pageFromParam(null)).toBe(0);
  });

  it("ignores nonsense rather than requesting a negative offset", () => {
    expect(pageFromParam("0")).toBe(0);
    expect(pageFromParam("-3")).toBe(0);
    expect(pageFromParam("banana")).toBe(0);
    expect(pageFromParam("")).toBe(0);
    expect(pageFromParam("Infinity")).toBe(0);
  });

  it("truncates a fractional page", () => {
    expect(pageFromParam("3.7")).toBe(2);
  });
});

describe("pageToParam", () => {
  it("writes a 0-based index as the 1-based number the pager shows", () => {
    expect(pageToParam(0)).toBe("1");
    expect(pageToParam(3)).toBe("4");
  });
});

describe("round trip", () => {
  it("survives a reload at any page", () => {
    for (let page = 0; page < 25; page += 1) {
      expect(pageFromParam(pageToParam(page))).toBe(page);
    }
  });
});
