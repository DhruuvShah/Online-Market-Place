import type { Order, Product } from "@/types";
import { baseApi } from "./base.api";

export type TopProduct = {
  id: string;
  title: string;
  image?: string;
  sold: number;
  revenue: number;
};

export type RevenuePoint = {
  date: string;
  revenue: number;
  orders: number;
  units: number;
};

export type StockLevel = {
  id: string;
  title: string;
  stock: number;
};

export type SellerMetrics = {
  sales: number;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  productCount: number;
  recentOrderCount: number;
  topProducts: TopProduct[];
  revenueSeries: RevenuePoint[];
  stockLevels: StockLevel[];
  stockSummary: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    units: number;
  };
};

export type SellerProductQuery = {
  q?: string;
  stock?: "in" | "low" | "out";
};

export type SellerOrder = Omit<Order, "user"> & {
  user: {
    _id: string;
    username: string;
    email: string;
    fullName: { firstName: string; lastName: string };
  } | null;
};

export const sellerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sellerMetrics: builder.query<SellerMetrics, void>({
      query: () => "/api/seller/dashboard/metrics",
      providesTags: ["SellerMetrics"],
    }),

    sellerOrders: builder.query<SellerOrder[], void>({
      query: () => "/api/seller/dashboard/orders",
      providesTags: ["SellerOrder"],
    }),

    sellerProducts: builder.query<Product[], SellerProductQuery | void>({
      query: (params) => ({
        url: "/api/seller/dashboard/products",
        params: params ?? undefined,
      }),
      providesTags: ["SellerProduct"],
    }),
  }),
});

export const {
  useSellerMetricsQuery,
  useSellerOrdersQuery,
  useSellerProductsQuery,
} = sellerApi;
