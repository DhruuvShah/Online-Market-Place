import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, Plus, TrendingUp } from "lucide-react";
import {
  useSellerMetricsQuery,
  useSellerOrdersQuery,
} from "@/services/seller.api";
import { useMyProductsQuery } from "@/services/product.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { OrderItemStack } from "@/features/orders/components/OrderItemList";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { StatGrid } from "@/components/ui/StatGrid";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatMoney } from "@/lib/format";

const LOW_STOCK = 5;
const STOCK_BARS = 8;

function Section({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-title flex items-center gap-2 text-lg font-medium">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const { data: metrics, isLoading: metricsLoading } = useSellerMetricsQuery();
  const { data: products, isLoading: productsLoading } = useMyProductsQuery();
  const { data: orders } = useSellerOrdersQuery();

  const catalog = useMemo(() => products ?? [], [products]);

  const revenuePoints = useMemo(
    () =>
      (metrics?.revenueSeries ?? []).map((point) => ({
        date: point.date,
        value: point.revenue,
      })),
    [metrics],
  );

  // Built from the live catalog rather than the dashboard projection, so a
  // restock or a new listing shows up here immediately.
  const stockBars = useMemo(
    () =>
      [...catalog]
        .sort((a, b) => b.stock - a.stock)
        .slice(0, STOCK_BARS)
        .map((product) => ({
          id: product._id,
          label: product.title,
          value: product.stock,
          tone:
            product.stock <= 0
              ? ("danger" as const)
              : product.stock <= LOW_STOCK
                ? ("warn" as const)
                : ("default" as const),
        })),
    [catalog],
  );

  if (metricsLoading || productsLoading) {
    return (
      <div className="shell py-12">
        <Skeleton className="h-10 w-64" />
        <div className="bg-line mt-10 grid gap-px sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="mt-14 h-56 w-full" />
      </div>
    );
  }

  if (catalog.length === 0) {
    return (
      <EmptyState
        icon={<Plus className="h-8 w-8" strokeWidth={1.5} />}
        title="Your storefront is empty"
        body="List your first product and it appears in the catalog straight away. Metrics start filling in as orders arrive."
        action={
          <Link to="/seller/products/new">
            <Button>List your first product</Button>
          </Link>
        }
      />
    );
  }

  const lowStock = catalog.filter(
    (product) => product.stock > 0 && product.stock <= LOW_STOCK,
  );
  const soldOut = catalog.filter((product) => product.stock <= 0);
  const recentOrders = (orders ?? []).slice(0, 5);
  const summary = catalog.reduce(
    (totals, product) => {
      totals.units += product.stock;
      if (product.stock <= 0) totals.outOfStock += 1;
      else if (product.stock <= LOW_STOCK) totals.lowStock += 1;
      else totals.inStock += 1;
      return totals;
    },
    { inStock: 0, lowStock: 0, outOfStock: 0, units: 0 },
  );

  const stats = [
    { label: "Items sold", value: String(metrics?.sales ?? 0) },
    { label: "Revenue", value: formatMoney(metrics?.revenue ?? 0) },
    {
      label: "Average order",
      value: formatMoney(metrics?.averageOrderValue ?? 0),
      hint: `across ${metrics?.orders ?? 0} paid ${
        (metrics?.orders ?? 0) === 1 ? "order" : "orders"
      }`,
    },
    {
      label: "Products listed",
      value: String(catalog.length),
      hint: `${summary.units} units in stock`,
      tone:
        soldOut.length > 0 ? ("warn" as const) : ("default" as const),
    },
  ];

  return (
    <div className="shell py-12 sm:py-16">
      <p className="text-eyebrow text-ink-subtle">Dashboard</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-section">
          {user
            ? `Welcome back, ${user.fullName?.firstName ?? user.username}`
            : "Overview"}
        </h1>
        <Link to="/seller/products/new">
          <Button>
            <Plus className="h-4 w-4" />
            New product
          </Button>
        </Link>
      </div>

      <div className="mt-10">
        <StatGrid stats={stats} columns={4} />
      </div>

      <Section
        title="Revenue, last 30 days"
        icon={<TrendingUp className="text-accent h-4 w-4" strokeWidth={2} />}
      >
        {revenuePoints.length > 0 ? (
          <LineChart
            points={revenuePoints}
            formatValue={(value) => formatMoney(value)}
            ariaLabel="Daily revenue over the last thirty days"
          />
        ) : (
          <p className="text-ink-muted text-[14px]">
            Revenue appears here once your first order is paid for.
          </p>
        )}
      </Section>

      <Section
        title="Stock on hand"
        icon={<Boxes className="text-accent h-4 w-4" strokeWidth={2} />}
        action={
          <Link
            to="/seller/products"
            className="hover:text-accent text-[13px] underline underline-offset-4"
          >
            Manage inventory
          </Link>
        }
      >
        <p className="text-ink-muted mb-6 text-[13px]">
            <span className="tnum text-ink">{summary.inStock}</span> healthy ·{" "}
            <span className="tnum text-honey">{summary.lowStock}</span> running
            low · <span className="tnum text-accent">{summary.outOfStock}</span>{" "}
            out of stock
        </p>

        <BarChart
          bars={stockBars}
          formatValue={(value) => (value === 0 ? "None left" : `${value} units`)}
          ariaLabel="Stock level per product"
          emptyLabel="Stock levels appear here once you list a product."
        />

        {catalog.length > STOCK_BARS && (
          <p className="text-ink-subtle mt-5 text-[13px]">
            Showing your {STOCK_BARS} best-stocked products of {catalog.length}.
          </p>
        )}
      </Section>

      {(lowStock.length > 0 || soldOut.length > 0) && (
        <Section
          title="Needs attention"
          icon={<AlertTriangle className="text-honey h-4 w-4" strokeWidth={2} />}
        >
          <ul className="divide-line border-line divide-y border-y">
            {[...soldOut, ...lowStock].map((product) => (
              <li key={product._id}>
                <Link
                  to={`/seller/products/${product._id}/edit`}
                  className="hover:text-accent flex items-center justify-between gap-4 py-4 text-[14px] transition-colors"
                >
                  <span className="truncate">{product.title}</span>
                  <span
                    className={`tnum shrink-0 ${
                      product.stock <= 0 ? "text-accent" : "text-honey"
                    }`}
                  >
                    {product.stock <= 0
                      ? "Out of stock"
                      : `${product.stock} left`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(metrics?.topProducts.length ?? 0) > 0 && (
        <Section
          title="Best sellers"
          icon={<TrendingUp className="text-accent h-4 w-4" strokeWidth={2} />}
        >
          <ul className="divide-line border-line divide-y border-y">
            {metrics?.topProducts.map((product) => (
              <li key={product.id} className="flex items-center gap-4 py-4">
                <div className="bg-sunken h-12 w-12 shrink-0 overflow-hidden rounded-sm">
                  {product.image && (
                    <img
                      src={product.image}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <span className="text-title min-w-0 flex-1 truncate text-[14px]">
                  {product.title}
                </span>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="tnum text-[14px]">
                    {formatMoney(product.revenue)}
                  </span>
                  <span className="tnum text-ink-subtle text-[12px]">
                    {product.sold} sold
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title="Recent orders"
        action={
          <Link
            to="/seller/orders"
            className="hover:text-accent text-[13px] underline underline-offset-4"
          >
            View all
          </Link>
        }
      >
        {recentOrders.length === 0 ? (
          <p className="text-ink-muted text-[14px]">
            No orders yet. They appear here as soon as a buyer checks out.
          </p>
        ) : (
          <ul className="divide-line border-line divide-y border-y">
            {recentOrders.map((order) => (
              <li
                key={order._id}
                className="flex flex-wrap items-center gap-4 py-4"
              >
                <OrderItemStack items={order.items} max={3} />

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-title truncate text-[14px]">
                    {order.items[0]?.title ??
                      `${order.items.length} item${order.items.length === 1 ? "" : "s"}`}
                  </span>
                  <span className="text-ink-muted text-[13px]">
                    {formatDate(order.createdAt)}
                    {order.user &&
                      ` · ${order.user.fullName?.firstName ?? order.user.username}`}
                  </span>
                </div>

                <OrderStatusBadge status={order.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
