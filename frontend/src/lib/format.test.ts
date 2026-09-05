import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatPrice, stockLabel } from "./format";

describe("formatMoney", () => {
  it("formats rupees in the Indian grouping", () => {
    // 1,28,000 rather than 128,000 — the lakh grouping is the whole point of
    // using en-IN here.
    expect(formatMoney(128000)).toContain("1,28,000");
  });

  it("defaults to rupees", () => {
    expect(formatMoney(500)).toContain("₹");
  });

  it("formats dollars when asked", () => {
    expect(formatMoney(500, "USD")).toContain("$");
  });

  it("renders zero rather than an empty string", () => {
    expect(formatMoney(0)).toContain("0");
  });
});

describe("formatPrice", () => {
  it("formats a money object", () => {
    expect(formatPrice({ amount: 1200, currency: "INR" })).toContain("1,200");
  });

  it("says so when there is no price rather than printing NaN", () => {
    expect(formatPrice(null)).toBe("Unavailable");
    expect(formatPrice(undefined)).toBe("Unavailable");
  });
});

describe("stockLabel", () => {
  it("flags sold out", () => {
    expect(stockLabel(0)).toEqual({ label: "Out of stock", tone: "danger" });
  });

  it("warns when only a few are left", () => {
    expect(stockLabel(3)).toEqual({ label: "Only 3 left", tone: "warn" });
  });

  it("treats five as the last warning step", () => {
    expect(stockLabel(5).tone).toBe("warn");
    expect(stockLabel(6).tone).toBe("ok");
  });

  it("handles an unknown stock level", () => {
    expect(stockLabel(null).tone).toBe("muted");
  });

  it("treats a negative count as sold out", () => {
    expect(stockLabel(-2).tone).toBe("danger");
  });
});

describe("formatDate", () => {
  it("renders a readable day, month and year", () => {
    const formatted = formatDate("2026-03-14T10:00:00.000Z");

    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/Mar/);
  });
});
