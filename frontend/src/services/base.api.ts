import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

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

export type TagType = (typeof TAGS)[number];

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:8080",
  credentials: "include",
});

/**
 * A sleeping backend answers the first request with a timeout or a gateway
 * error, which would otherwise look identical to "you are signed out" and
 * bounce the visitor to a login that cannot work yet. Retrying rides out the
 * cold start; 4xx responses are real answers and are never retried.
 */
const baseQueryWithRetry = retry<
  BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>
>(
  async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);
    const status = result.error?.status;

    if (typeof status === "number" && status >= 400 && status < 500) {
      retry.fail(result.error);
    }

    return result;
  },
  { maxRetries: 3 },
);

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithRetry,
  tagTypes: TAGS,

  // By default a cached answer is served without going back to the server, so
  // walking from a product to the cart showed whatever the cart held when it
  // was last opened. Data here also changes without the client doing anything
  // — an order fulfils itself, the assistant fills the cart on the server —
  // so nothing that arrives on screen is safe to assume is still true.
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,

  endpoints: () => ({}),
});
