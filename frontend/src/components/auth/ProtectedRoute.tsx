import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import type { Permission } from "../../types";

// ── ProtectedRoute: redirect to login if not authenticated ────────────────────

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

// ── PermissionGate: render children only if user has permission ───────────────

interface PermissionGateProps {
  permission: Permission;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}

// ── RoleGate: render children only if user has one of the given roles ─────────

interface RoleGateProps {
  roles: Array<"admin" | "manager" | "warehouse_staff" | "viewer">;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleGate({ roles, fallback = null, children }: RoleGateProps) {
  const hasRole = useAuthStore((s) => s.hasRole);
  return hasRole(...roles) ? <>{children}</> : <>{fallback}</>;
}
