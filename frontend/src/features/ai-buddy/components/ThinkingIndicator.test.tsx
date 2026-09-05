import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { PHRASE_INTERVAL } from "@/features/ai-buddy/thinkingPhrases";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ThinkingIndicator", () => {
  it("opens on the first stage", () => {
    render(<ThinkingIndicator />);

    expect(screen.getByRole("status")).toHaveTextContent("Reading your message");
  });

  it("announces the current stage politely", () => {
    render(<ThinkingIndicator />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("moves off the opening line on its own", () => {
    render(<ThinkingIndicator />);

    act(() => {
      vi.advanceTimersByTime(PHRASE_INTERVAL);
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Searching the catalog",
    );
  });

  it("is still changing long after the opening stages run out", () => {
    render(<ThinkingIndicator />);

    act(() => {
      vi.advanceTimersByTime(PHRASE_INTERVAL * 7);
    });

    expect(screen.getByRole("status")).toHaveTextContent("Almost there");
  });

  it("stops its timer when it unmounts", () => {
    const clear = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = render(<ThinkingIndicator />);

    unmount();

    expect(clear).toHaveBeenCalled();
  });
});
