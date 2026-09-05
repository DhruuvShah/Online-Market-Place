import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Landing from "./Landing";

const renderLanding = () =>
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );

describe("Landing", () => {
  it("leads with the proposition, not a slogan", () => {
    renderLanding();

    expect(
      screen.getByRole("heading", { name: /A marketplace built by many hands/ }),
    ).toBeInTheDocument();
  });

  it("offers both sides of the marketplace a way in", () => {
    renderLanding();

    expect(screen.getByText("Start shopping")).toBeInTheDocument();
    expect(screen.getByText("Sell on HiveMind")).toBeInTheDocument();
  });

  it("sends every call to action somewhere real", () => {
    renderLanding();

    const targets = new Set(
      screen.getAllByRole("link").map((link) => link.getAttribute("href")),
    );

    expect(targets).toContain("/register");
    expect(targets).toContain("/login");
    for (const href of targets) {
      expect(href).toMatch(/^\//);
    }
  });

  it("explains how buying works in ordered steps", () => {
    renderLanding();

    expect(screen.getByText("Find it")).toBeInTheDocument();
    expect(screen.getByText("Reserve it")).toBeInTheDocument();
    expect(screen.getByText("Pay and track")).toBeInTheDocument();
  });

  it("makes the case to sellers as well as shoppers", () => {
    renderLanding();

    expect(
      screen.getByRole("heading", { name: /Your shelf, your prices/ }),
    ).toBeInTheDocument();
  });

  it("keeps the answers collapsed until asked", () => {
    renderLanding();

    const question = screen.getByRole("button", {
      name: /What happens if something sells out/,
    });

    expect(question).toHaveAttribute("aria-expanded", "false");
  });

  it("opens an answer when the question is clicked", async () => {
    renderLanding();

    const question = screen.getByRole("button", {
      name: /Can a seller change the price/,
    });
    await userEvent.click(question);

    expect(question).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/Every order stores its own copy/),
    ).toBeInTheDocument();
  });

  it("closes an answer again on a second click", async () => {
    renderLanding();

    const question = screen.getByRole("button", { name: /How do I cancel/ });

    await userEvent.click(question);
    await userEvent.click(question);

    expect(question).toHaveAttribute("aria-expanded", "false");
  });

  it("lets several answers be open at once", async () => {
    renderLanding();

    const first = screen.getByRole("button", { name: /How do I cancel/ });
    const second = screen.getByRole("button", { name: /Is it free to sell/ });

    await userEvent.click(first);
    await userEvent.click(second);

    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(second).toHaveAttribute("aria-expanded", "true");
  });
});
