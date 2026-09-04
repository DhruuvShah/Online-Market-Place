import type { Product } from "@/types";
import { baseApi } from "./base.api";

export type UpdateProductBody = {
  title?: string;
  description?: string;
  price?: { amount: number; currency: "INR" | "USD" };
  stock?: number;
};

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

    createProduct: builder.mutation<Product, FormData>({
      query: (body) => ({ url: "/api/products", method: "POST", body }),
      transformResponse: (response: { data: Product }) => response.data,
      invalidatesTags: ["Product", "SellerProduct", "SellerMetrics"],
    }),

    updateProduct: builder.mutation<
      Product,
      { id: string; body: UpdateProductBody }
    >({
      query: ({ id, body }) => ({
        url: `/api/products/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: { product: Product }) => response.product,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Product", id },
        "Product",
        "SellerProduct",
      ],
    }),

    addProductImages: builder.mutation<Product, { id: string; body: FormData }>({
      query: ({ id, body }) => ({
        url: `/api/products/${id}/images`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { product: Product }) => response.product,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Product", id },
        "Product",
        "SellerProduct",
      ],
    }),

    deleteProductImage: builder.mutation<
      Product,
      { id: string; imageId: string }
    >({
      query: ({ id, imageId }) => ({
        url: `/api/products/${id}/images/${imageId}`,
        method: "DELETE",
      }),
      transformResponse: (response: { product: Product }) => response.product,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Product", id },
        "Product",
        "SellerProduct",
      ],
    }),

    deleteProduct: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/api/products/${id}`, method: "DELETE" }),
      invalidatesTags: ["Product", "SellerProduct", "SellerMetrics"],
    }),
  }),
});

export const {
  useProductsQuery,
  useProductQuery,
  useCreateProductMutation,
  useAddProductImagesMutation,
  useDeleteProductImageMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
