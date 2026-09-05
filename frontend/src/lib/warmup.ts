export type ServiceKey =
  | "AUTH"
  | "PRODUCT"
  | "CART"
  | "ORDER"
  | "PAYMENT"
  | "AI_BUDDY"
  | "SELLER_DASHBOARD";

export type WakeStatus = "waking" | "ready";

export type WakeSnapshot = {
  services: { key: ServiceKey; label: string; status: WakeStatus }[];
  ready: number;
  total: number;
  /** True when there is nothing to wake — local dev, or no API URL set. */
  idle: boolean;
};

const SERVICES: { key: ServiceKey; label: string }[] = [
  { key: "AUTH", label: "Accounts" },
  { key: "PRODUCT", label: "Catalog" },
  { key: "CART", label: "Cart" },
  { key: "ORDER", label: "Orders" },
  { key: "PAYMENT", label: "Payments" },
  { key: "SELLER_DASHBOARD", label: "Seller dashboard" },
  { key: "AI_BUDDY", label: "Assistant" },
];

const listeners = new Set<() => void>();
const status = new Map<ServiceKey, WakeStatus>();

let started = false;
let idle = false;
let snapshot: WakeSnapshot = buildSnapshot();

function buildSnapshot(): WakeSnapshot {
  const services = SERVICES.map((service) => ({
    ...service,
    status: status.get(service.key) ?? "waking",
  }));

  return {
    services,
    ready: services.filter((service) => service.status === "ready").length,
    total: services.length,
    idle,
  };
}

// useSyncExternalStore compares by reference, so the snapshot is rebuilt only
// when something actually changed. Rebuilding on every read would loop.
function publish() {
  snapshot = buildSnapshot();
  listeners.forEach((listener) => listener());
}

function markReady(key: ServiceKey) {
  if (status.get(key) === "ready") return;
  status.set(key, "ready");
  publish();
}

function healthUrl(base: string, key: ServiceKey) {
  const host = new URL(base).host;
  const gatewayName = host.split(".")[0];
  const name = gatewayName.replace(
    /-gateway$/,
    `-${key.toLowerCase().replace(/_/g, "-")}`,
  );

  return `https://${host.replace(gatewayName, name)}/health`;
}

export function warmServices() {
  if (started) return;
  started = true;

  const base = import.meta.env.VITE_API_URL;

  if (!base || base.includes("localhost")) {
    idle = true;
    SERVICES.forEach((service) => status.set(service.key, "ready"));
    publish();
    return;
  }

  // no-cors gives an opaque response we cannot read, but the fetch settling at
  // all means the container answered — which is the only signal we need.
  SERVICES.forEach((service) => {
    fetch(healthUrl(base, service.key), { mode: "no-cors", cache: "no-store" })
      .then(() => markReady(service.key))
      .catch(() => markReady(service.key));
  });
}

export function subscribeToWarmup(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWarmupSnapshot() {
  return snapshot;
}

/** Test seam. Resets module state between cases. */
export function resetWarmupForTests() {
  started = false;
  idle = false;
  status.clear();
  listeners.clear();
  snapshot = buildSnapshot();
}
