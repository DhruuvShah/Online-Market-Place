import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getWarmupSnapshot,
  resetWarmupForTests,
  subscribeToWarmup,
  warmServices,
} from "./warmup";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  resetWarmupForTests();
  vi.stubEnv("VITE_API_URL", "https://hivemind-gateway.onrender.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("warmServices", () => {
  it("pings every service health endpoint derived from the gateway host", () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(() =>
      Promise.resolve(new Response()),
    );
    vi.stubGlobal("fetch", fetchMock);

    warmServices();

    const called = fetchMock.mock.calls.map(([url]) => url);
    expect(called).toContain("https://hivemind-auth.onrender.com/health");
    expect(called).toContain("https://hivemind-product.onrender.com/health");
    expect(called).toContain(
      "https://hivemind-seller-dashboard.onrender.com/health",
    );
    expect(called).toContain("https://hivemind-ai-buddy.onrender.com/health");
    expect(called).toHaveLength(7);
  });

  it("starts with everything waking", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    warmServices();
    const snapshot = getWarmupSnapshot();

    expect(snapshot.ready).toBe(0);
    expect(snapshot.total).toBe(7);
    expect(snapshot.services.every((s) => s.status === "waking")).toBe(true);
  });

  it("marks a service ready once its health check settles", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response())));

    warmServices();
    await flush();

    expect(getWarmupSnapshot().ready).toBe(7);
  });

  it("treats a rejected probe as awake too, since opaque responses tell us nothing", async () => {
    // no-cors gives an opaque response; a rejection here means the request
    // finished one way or another, which is all the screen needs to know.
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("opaque"))));

    warmServices();
    await flush();

    expect(getWarmupSnapshot().ready).toBe(7);
  });

  it("notifies subscribers as services come up", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response())));
    const listener = vi.fn();
    subscribeToWarmup(listener);

    warmServices();
    await flush();

    expect(listener).toHaveBeenCalled();
  });

  it("returns a stable snapshot reference between changes", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    warmServices();

    // useSyncExternalStore compares by reference; a fresh object per read
    // would spin the render loop.
    expect(getWarmupSnapshot()).toBe(getWarmupSnapshot());
  });

  it("only warms once however often it is called", () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response()));
    vi.stubGlobal("fetch", fetchMock);

    warmServices();
    warmServices();
    warmServices();

    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it("skips the probes in local development and reports ready", () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:8080");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    warmServices();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getWarmupSnapshot().idle).toBe(true);
    expect(getWarmupSnapshot().ready).toBe(7);
  });

  it("does nothing when no API url is configured", () => {
    vi.stubEnv("VITE_API_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    warmServices();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getWarmupSnapshot().idle).toBe(true);
  });

  it("stops notifying once a subscriber unsubscribes", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response())));
    const listener = vi.fn();
    const unsubscribe = subscribeToWarmup(listener);

    unsubscribe();
    warmServices();
    await flush();

    expect(listener).not.toHaveBeenCalled();
  });
});
