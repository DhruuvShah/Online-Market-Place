import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatGrid } from "./StatGrid";

const stats = [
  { label: "Items sold", value: "0" },
  { label: "Revenue", value: "₹0.00" },
  { label: "Products listed", value: "24" },
];

describe("StatGrid", () => {
  it("renders every figure with its label", () => {
    render(<StatGrid stats={stats} />);

    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("₹0.00")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByText("Items sold")).toBeInTheDocument();
  });

  it("gives every cell its own inline padding, so a value never touches a rule", () => {
    const { container } = render(<StatGrid stats={stats} />);

    const cells = container.querySelectorAll(".rule-cell");
    expect(cells).toHaveLength(stats.length);
  });

  it("does not put the numerals in the slashed-zero mono face", () => {
    render(<StatGrid stats={stats} />);

    // text-stat carries tabular figures with the slashed zero disabled; tnum
    // would bring the mono face and its slashed zero back.
    const figure = screen.getByText("0");
    expect(figure.className).toContain("text-stat");
    expect(figure.className).not.toContain("tnum");
  });

  it("shows an optional hint under the label", () => {
    render(
      <StatGrid
        stats={[{ label: "Average order", value: "₹500", hint: "across 3 orders" }]}
      />,
    );

    expect(screen.getByText("across 3 orders")).toBeInTheDocument();
  });

  it("tones a figure that needs attention", () => {
    render(<StatGrid stats={[{ label: "Sold out", value: "3", tone: "warn" }]} />);

    expect(screen.getByText("3").className).toContain("text-honey");
  });

  it("lays out four columns when asked", () => {
    const { container } = render(<StatGrid stats={stats} columns={4} />);

    expect(container.firstElementChild?.className).toContain("lg:grid-cols-4");
  });

  it("renders nothing but the frame for an empty set", () => {
    const { container } = render(<StatGrid stats={[]} />);

    expect(container.querySelectorAll(".rule-cell")).toHaveLength(0);
  });
});
