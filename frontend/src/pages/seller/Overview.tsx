import { Link } from "react-router-dom";
import { AlertTriangle, Plus, TrendingUp } from "lucide-react";
import { useSellerMetricsQuery, useSellerProductsQuery, useSellerOrdersQuery } from "@/services/seller.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatMoney } from "@/lib/format";

const LOW_STOCK = 5;

export default function Overview() {
  const { user } = useAuth();
  const { data: metrics, isLoading: metricsLoading } = useSellerMetricsQuery();
  const { data: products, isLoading: productsLoading } = useSellerProductsQuery();
  const { data: orders } = useSellerOrdersQuery();

  const isLoading = metricsLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="shell py-12">
        <Skeleton className="h-10 w-64" />
        <div className="mt-10 grid gap-px bg-line sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const catalog = products ?? [];

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

  const stats = [
    { label: "Items sold", value: String(metrics?.sales ?? 0) },
    { label: "Revenue", value: formatMoney(metrics?.revenue ?? 0) },
    { label: "Products listed", value: String(catalog.length) },
  ];

  return (
    <div className="shell py-12 sm:py-16">
      <p className="text-eyebrow text-ink-subtle">Dashboard</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-section">
          {user ? `Welcome back, ${user.fullName?.firstName ?? user.username}` : "Overview"}
        </h1>
        <Link to="/seller/products/new">
          <Button>
            <Plus className="h-4 w-4" />
            New product
          </Button>
        </Link>
      </div>

      <div className="mt-10 grid gap-px border-y border-line bg-line sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-canvas py-8">
            <div className="tnum text-3xl font-medium">{stat.value}</div>
            <div className="mt-2 text-[13px] text-ink-muted">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {(lowStock.length > 0 || soldOut.length > 0) && (
        <section className="mt-14">
          <h2 className="text-title flex items-center gap-2 text-lg font-medium">
            <AlertTriangle className="h-4 w-4 text-honey" strokeWidth={2} />
            Needs attention
          </h2>

          <ul className="mt-5 divide-y divide-line border-y border-line">
            {[...soldOut, ...lowStock].map((product) => (
              <li key={product._id}>
                <Link
                  to={`/seller/products/${product._id}/edit`}
                  className="flex items-center justify-between gap-4 py-4 text-[14px] transition-colors hover:text-accent"
                >
                  <span>{product.title}</span>
                  <span
                    className={
                      product.stock <= 0
                        ? "text-accent"
                        : "text-honey"
                    }
                  >
                    {product.stock <= 0
                      ? "Out of stock"
                      : `${product.stock} left`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(metrics?.topProducts?.length ?? 0) > 0 && (
        <section className="mt-14">
          <h2 className="text-title flex items-center gap-2 text-lg font-medium">
            <TrendingUp className="h-4 w-4 text-accent" strokeWidth={2} />
            Top products
          </h2>

          <ul className="mt-5 divide-y divide-line border-y border-line">
            {metrics?.topProducts.map((product) => (
              <li
                key={product.id}
                className="flex items-center justify-between gap-4 py-4 text-[14px]"
              >
                <span>{product.title}</span>
                <span className="tnum text-ink-muted">
                  {product.sold} sold
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-title text-lg font-medium">Recent orders</h2>
          <Link
            to="/seller/orders"
            className="text-[13px] underline underline-offset-4 hover:text-accent"
          >
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <p className="mt-5 text-[14px] text-ink-muted">
            No orders yet. They appear here as soon as a buyer checks out.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-line border-y border-line">
            {recentOrders.map((order) => (
              <li
                key={order._id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="flex flex-col gap-1">
                  <span className="tnum text-[14px]">
                    {order._id.slice(-12).toUpperCase()}
                  </span>
                  <span className="text-[13px] text-ink-muted">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <OrderStatusBadge status={order.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
