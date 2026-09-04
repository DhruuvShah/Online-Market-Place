const SERVICES = [
  "AUTH",
  "PRODUCT",
  "CART",
  "ORDER",
  "PAYMENT",
  "AI_BUDDY",
  "SELLER_DASHBOARD",
] as const;

let started = false;

export function warmServices() {
  if (started) return;
  started = true;

  const base = import.meta.env.VITE_API_URL;
  if (!base || base.includes("localhost")) return;

  const host = new URL(base).host;
  const gatewayName = host.split(".")[0];

  SERVICES.forEach((service) => {
    const name = gatewayName.replace(
      /-gateway$/,
      `-${service.toLowerCase().replace(/_/g, "-")}`,
    );
    const url = `https://${host.replace(gatewayName, name)}/health`;

    fetch(url, { mode: "no-cors", cache: "no-store" }).catch(() => undefined);
  });
}
