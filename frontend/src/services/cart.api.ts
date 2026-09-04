import type { CartView } from "@/types";
import { baseApi } from "./base.api";

export const cartApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    cart: builder.query<CartView, void>({
      query: () => "/api/cart",
      providesTags: ["Cart"],
    }),

    addToCart: builder.mutation<CartView, { productId: string; qty: number }>({
      query: (body) => ({ url: "/api/cart/items", method: "POST", body }),
      invalidatesTags: ["Cart"],
    }),

    updateCartItem: builder.mutation<
      CartView,
      { productId: string; qty: number }
    >({
      query: ({ productId, qty }) => ({
        url: `/api/cart/items/${productId}`,
        method: "PATCH",
        body: { qty },
      }),
      invalidatesTags: ["Cart"],
    }),

    removeCartItem: builder.mutation<CartView, string>({
      query: (productId) => ({
        url: `/api/cart/items/${productId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Cart"],
    }),

    clearCart: builder.mutation<{ message: string }, void>({
      query: () => ({ url: "/api/cart", method: "DELETE" }),
      invalidatesTags: ["Cart"],
    }),
  }),
});

export const {
  useCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} = cartApi;
