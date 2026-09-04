import type { Payment } from "@/types";
import { baseApi } from "./base.api";

export type VerifyPaymentBody = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export const paymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createPayment: builder.mutation<Payment, string>({
      query: (orderId) => ({
        url: `/api/payments/create/${orderId}`,
        method: "POST",
      }),
      transformResponse: (response: { payment: Payment }) => response.payment,
    }),

    verifyPayment: builder.mutation<{ message: string }, VerifyPaymentBody>({
      query: (body) => ({ url: "/api/payments/verify", method: "POST", body }),
      invalidatesTags: ["Order"],
    }),
  }),
});

export const { useCreatePaymentMutation, useVerifyPaymentMutation } = paymentApi;
