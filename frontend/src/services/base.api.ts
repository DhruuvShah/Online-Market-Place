import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const TAGS = [
  "Auth",
  "Address",
  "Product",
  "SellerProduct",
  "Cart",
  "Order",
  "SellerMetrics",
  "SellerOrder",
] as const;

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8080",
    credentials: "include",
  }),
  tagTypes: TAGS,
  endpoints: () => ({}),
});
