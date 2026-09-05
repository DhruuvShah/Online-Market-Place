import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// jsdom implements neither of these, and Motion asks for both on mount.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

window.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Motion's whileInView needs this. Reporting everything as already visible
// means scroll-reveal content is in the DOM for assertions.
window.IntersectionObserver ??= class {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];

  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this,
    );
  }

  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

// Narrowed to a plain optional property so filling the gap is an assignment
// rather than an unbound reference to a prototype method.
const elementProto = Element.prototype as { scrollIntoView?: () => void };
elementProto.scrollIntoView ??= () => {};
