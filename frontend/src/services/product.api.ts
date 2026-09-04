import type { Product } from "@/types";
import { baseApi } from "./base.api";

export type ProductQuery = {
  q?: string;
  minprice?: number;
  maxprice?: number;
  skip?: number;
  limit?: number;
};

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    products: builder.query<Product[], ProductQuery>({
      query: (params) => ({ url: "/api/products", params }),
      transformResponse: (response: { data: Product[] }) => response.data ?? [],
      providesTags: ["Product"],
    }),

    product: builder.query<Product, string>({
      query: (id) => `/api/products/${id}`,
      transformResponse: (response: { data: Product }) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Product", id }],
    }),
  }),
});

export const { useProductsQuery, useProductQuery } = productApi;
