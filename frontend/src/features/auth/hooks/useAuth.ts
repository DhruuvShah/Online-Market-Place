import { useMeQuery } from "@/services/auth.api";

export function useAuth() {
  const { data: user, isLoading, isError } = useMeQuery();

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !isError && Boolean(user),
    isSeller: user?.role === "seller",
  };
}
