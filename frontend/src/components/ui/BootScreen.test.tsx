import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BootScreen } from "./BootScreen";
import { resetWarmupForTests } from "@/lib/warmup";
import { SLOW_AFTER_SECONDS } from "@/hooks/useServiceWakeup";

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  resetWarmupForTests();
  vi.stubEnv("VITE_API_URL", "https://hivemind-gateway.onrender.com");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("BootScreen", () => {
  it("explains what is happening instead of showing a blank page", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<BootScreen />);

    expect(
      screen.getByRole("heading", { name: /Waking the marketplace/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/sleep when nobody is shopping/)).toBeInTheDocument();
  });

  it("names every service it is waiting on", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<BootScreen />);

    for (const label of [
      "Accounts",
      "Catalog",
      "Cart",
      "Orders",
      "Payments",
      "Seller dashboard",
      "Assistant",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("starts with nothing ready", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<BootScreen />);

    expect(screen.getByText("0 of 7 ready")).toBeInTheDocument();
  });

  it("counts services up as they answer", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response())));

    render(<BootScreen />);
    await flush();

    expect(screen.getByText("7 of 7 ready")).toBeInTheDocument();
  });

  it("shows elapsed time so the wait is not open ended", () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<BootScreen />);
    expect(screen.getByText("0s")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("3s")).toBeInTheDocument();
  });

  it("stays quiet about a slow start until it really is slow", () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<BootScreen />);

    expect(screen.queryByText(/Still going/)).not.toBeInTheDocument();
  });

  it("reassures the visitor once the wait runs long", () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    render(<BootScreen />);

    act(() => {
      vi.advanceTimersByTime(SLOW_AFTER_SECONDS * 1000);
    });

    expect(screen.getByText(/Still going/)).toBeInTheDocument();
    expect(screen.getByText(/nothing is broken/)).toBeInTheDocument();
  });

  it("stops its clock when it unmounts", () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));
    const clear = vi.spyOn(globalThis, "clearInterval");

    const { unmount } = render(<BootScreen />);
    unmount();

    expect(clear).toHaveBeenCalled();
  });
});
