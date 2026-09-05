import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo } from "./Logo";

describe("Logo", () => {
  it("shows the wordmark by default", () => {
    render(<Logo />);

    expect(screen.getByText("HiveMind")).toBeInTheDocument();
  });

  it("can render the mark alone", () => {
    render(<Logo withWordmark={false} />);

    expect(screen.queryByText("HiveMind")).not.toBeInTheDocument();
  });

  it("gives the wordmark a tight em-box so it levels with nav links", () => {
    // Mixed type sizes on one row only look level when both boxes are tight;
    // the default line-height leaves the larger word sitting off-centre.
    render(<Logo />);

    expect(screen.getByText("HiveMind").className).toContain("leading-none");
  });

  it("centres the mark and the wordmark on one axis", () => {
    render(<Logo />);

    const wrapper = screen.getByText("HiveMind").parentElement;
    expect(wrapper?.className).toContain("items-center");
    expect(wrapper?.className).toContain("inline-flex");
  });

  it("hides the mark from assistive tech, since the wordmark carries the name", () => {
    const { container } = render(<Logo />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
