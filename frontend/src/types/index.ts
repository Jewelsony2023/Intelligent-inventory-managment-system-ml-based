// ── Roles & Permissions ───────────────────────────────────────────────────────

export type Role = "admin" | "manager" | "warehouse_staff" | "viewer";

export type Permission =
  | "inventory:read" | "inventory:write" | "inventory:delete"
  | "product:read" | "product:write" | "product:delete"
  | "order:read" | "order:write" | "order:approve"
  | "supplier:read" | "supplier:write"
  | "analytics:read" | "forecast:read" | "forecast:configure"
  | "alert:read" | "alert:manage"
  | "user:read" | "user:write" | "user:delete" | "role:manage"
  | "audit:read"
  | "settings:read" | "settings:write";

// ── User ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  permissions: Permission[];
  created_at: string;
  last_login: string | null;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
