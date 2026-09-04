import type { Order, Product } from "@/types";
import { baseApi } from "./base.api";

export type SellerMetrics = {
  sales: number;
  revenue: number;
  topProducts: { id: string; title: string; sold: number }[];
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

    sellerProducts: builder.query<Product[], void>({
      query: () => "/api/seller/dashboard/products",
      providesTags: ["SellerProduct"],
    }),
  }),
});

export const {
  useSellerMetricsQuery,
  useSellerOrdersQuery,
  useSellerProductsQuery,
} = sellerApi;
