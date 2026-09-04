import type { Address, Role, User } from "@/types";
import { baseApi } from "./base.api";

export type RegisterBody = {
  username: string;
  email: string;
  password: string;
  fullName: { firstName: string; lastName: string };
  role: Role;
};

export type LoginBody = {
  password: string;
  email?: string;
  username?: string;
};

export type UpdateProfileBody = {
  username?: string;
  email?: string;
  fullName?: { firstName?: string; lastName?: string };
};

export type AddAddressBody = {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<{ user: User }, RegisterBody>({
      query: (body) => ({ url: "/api/auth/register", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),

    login: builder.mutation<{ user: User }, LoginBody>({
      query: (body) => ({ url: "/api/auth/login", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),

    logout: builder.mutation<{ message: string }, void>({
      query: () => ({ url: "/api/auth/logout", method: "GET" }),
      invalidatesTags: ["Auth", "Cart", "Order", "Address"],
    }),

    me: builder.query<User, void>({
      query: () => "/api/auth/me",
      transformResponse: (response: { user: User }) => response.user,
      providesTags: ["Auth"],
    }),

    updateProfile: builder.mutation<{ user: User }, UpdateProfileBody>({
      query: (body) => ({ url: "/api/auth/users/me", method: "PATCH", body }),
      invalidatesTags: ["Auth"],
    }),

    addresses: builder.query<Address[], void>({
      query: () => "/api/auth/users/me/addresses",
      transformResponse: (response: { addresses: Address[] }) =>
        response.addresses ?? [],
      providesTags: ["Address"],
    }),

    addAddress: builder.mutation<{ address: Address }, AddAddressBody>({
      query: (body) => ({
        url: "/api/auth/users/me/addresses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Address", "Auth"],
    }),

    deleteAddress: builder.mutation<{ message: string }, string>({
      query: (addressId) => ({
        url: `/api/auth/users/me/addresses/${addressId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Address", "Auth"],
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useMeQuery,
  useUpdateProfileMutation,
  useAddressesQuery,
  useAddAddressMutation,
  useDeleteAddressMutation,
} = authApi;
