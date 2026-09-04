import type { Order, ShippingAddressInput } from "@/types";
import { baseApi } from "./base.api";

type OrdersResponse = {
  orders: Order[];
  meta: { total: number; page: number; limit: number };
};

export const orderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createOrder: builder.mutation<Order, { shippingAddress: ShippingAddressInput }>({
      query: (body) => ({ url: "/api/orders", method: "POST", body }),
      transformResponse: (response: { order: Order }) => response.order,
      invalidatesTags: ["Cart", "Order", "Product"],
    }),

    myOrders: builder.query<OrdersResponse, { page?: number; limit?: number }>({
      query: (params) => ({ url: "/api/orders/me", params }),
      providesTags: ["Order"],
    }),

    order: builder.query<Order, string>({
      query: (id) => `/api/orders/${id}`,
      transformResponse: (response: { order: Order }) => response.order,
      providesTags: (_result, _error, id) => [{ type: "Order", id }],
    }),

    cancelOrder: builder.mutation<Order, string>({
      query: (id) => ({ url: `/api/orders/${id}/cancel`, method: "POST" }),
      transformResponse: (response: { order: Order }) => response.order,
      invalidatesTags: ["Order", "Product"],
    }),

    updateOrderAddress: builder.mutation<
      Order,
      { id: string; shippingAddress: ShippingAddressInput }
    >({
      query: ({ id, shippingAddress }) => ({
        url: `/api/orders/${id}/address`,
        method: "PATCH",
        body: { shippingAddress },
      }),
      transformResponse: (response: { order: Order }) => response.order,
      invalidatesTags: ["Order"],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useMyOrdersQuery,
  useOrderQuery,
  useCancelOrderMutation,
  useUpdateOrderAddressMutation,
} = orderApi;
