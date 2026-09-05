import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart } from "./BarChart";
import { LineChart } from "./LineChart";
import { formatMoney } from "@/lib/format";

const series = (values: number[]) =>
  values.map((value, index) => ({
    date: `2026-03-${String(index + 1).padStart(2, "0")}`,
    value,
  }));

describe("LineChart", () => {
  it("draws a path for the series", () => {
    const { container } = render(
      <LineChart
        points={series([10, 40, 20])}
        formatValue={formatMoney}
        ariaLabel="Daily revenue"
      />,
    );

    const paths = container.querySelectorAll("path");
    // One filled area plus the line itself.
    expect(paths.length).toBeGreaterThanOrEqual(2);
    expect(paths[1].getAttribute("d")).toMatch(/^M/);
  });

  it("is labelled for screen readers", () => {
    render(
      <LineChart
        points={series([1, 2])}
        formatValue={formatMoney}
        ariaLabel="Daily revenue"
      />,
    );

    expect(screen.getByRole("img", { name: "Daily revenue" })).toBeInTheDocument();
  });

  it("reports the peak value", () => {
    render(
      <LineChart
        points={series([100, 900, 400])}
        formatValue={formatMoney}
        ariaLabel="Daily revenue"
      />,
    );

    expect(screen.getByText(/Peak/)).toHaveTextContent("900");
  });

  it("says so plainly when nothing sold, instead of drawing a broken axis", () => {
    render(
      <LineChart
        points={series([0, 0, 0])}
        formatValue={formatMoney}
        ariaLabel="Daily revenue"
      />,
    );

    expect(screen.getByText("No sales in this window")).toBeInTheDocument();
  });

  it("produces no NaN coordinates for an all-zero series", () => {
    const { container } = render(
      <LineChart
        points={series([0, 0, 0])}
        formatValue={formatMoney}
        ariaLabel="Daily revenue"
      />,
    );

    const d = container.querySelectorAll("path")[1].getAttribute("d") ?? "";
    expect(d).not.toContain("NaN");
  });

  it("handles a single data point", () => {
    const { container } = render(
      <LineChart
        points={series([50])}
        formatValue={formatMoney}
        ariaLabel="Daily revenue"
      />,
    );

    const d = container.querySelectorAll("path")[1].getAttribute("d") ?? "";
    expect(d).not.toContain("NaN");
  });

  it("renders nothing for an empty series", () => {
    const { container } = render(
      <LineChart points={[]} formatValue={formatMoney} ariaLabel="Daily revenue" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the first and last day of the window", () => {
    render(
      <LineChart
        points={series([1, 2, 3])}
        formatValue={formatMoney}
        ariaLabel="Daily revenue"
      />,
    );

    expect(screen.getByText("1 Mar")).toBeInTheDocument();
    expect(screen.getByText("3 Mar")).toBeInTheDocument();
  });
});

describe("BarChart", () => {
  const bars = [
    { id: "a", label: "Aeron Chair", value: 40 },
    { id: "b", label: "Stagg Kettle", value: 10 },
    { id: "c", label: "Sold Out Lamp", value: 0 },
  ];

  it("labels every bar", () => {
    render(
      <BarChart
        bars={bars}
        formatValue={(value) => `${value} units`}
        ariaLabel="Stock per product"
      />,
    );

    expect(screen.getByText("Aeron Chair")).toBeInTheDocument();
    expect(screen.getByText("Stagg Kettle")).toBeInTheDocument();
    expect(screen.getByText("Sold Out Lamp")).toBeInTheDocument();
  });

  it("formats each value through the caller's formatter", () => {
    render(
      <BarChart
        bars={bars}
        formatValue={(value) => (value === 0 ? "None left" : `${value} units`)}
        ariaLabel="Stock per product"
      />,
    );

    expect(screen.getByText("40 units")).toBeInTheDocument();
    expect(screen.getByText("None left")).toBeInTheDocument();
  });

  it("is labelled as a list for assistive tech", () => {
    render(
      <BarChart
        bars={bars}
        formatValue={String}
        ariaLabel="Stock per product"
      />,
    );

    expect(screen.getByLabelText("Stock per product")).toBeInTheDocument();
  });

  it("shows an explanation rather than an empty box", () => {
    render(
      <BarChart
        bars={[]}
        formatValue={String}
        ariaLabel="Stock per product"
        emptyLabel="Nothing listed yet"
      />,
    );

    expect(screen.getByText("Nothing listed yet")).toBeInTheDocument();
  });
});
