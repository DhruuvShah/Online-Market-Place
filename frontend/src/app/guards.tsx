import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Role } from "@/types";

function Pending() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <p className="text-[14px] text-ink-muted">
        Waking up the marketplace…
      </p>
    </div>
  );
}

function homeFor(role: Role | undefined) {
  return role === "seller" ? "/seller" : "/discover";
}

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <Pending />;

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  if (user && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }

  return <Outlet />;
}

export function RedirectIfAuthed() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <Pending />;
  if (isAuthenticated) return <Navigate to={homeFor(user?.role)} replace />;

  return <Outlet />;
}
