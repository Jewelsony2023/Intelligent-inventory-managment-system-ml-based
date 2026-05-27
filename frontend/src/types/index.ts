// === Auth & User =============================================================

export type Permission =
  | "inventory:read"
  | "inventory:write"
  | "inventory:delete"
  | "users:read"
  | "users:write";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "warehouse_staff" | "viewer";
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login: string | null;
  permissions: Permission[];
}

export interface UserCreate {
  email: string;
  full_name: string;
  password: string;
  role: "admin" | "manager" | "warehouse_staff" | "viewer";
}

export interface UserUpdate {
  full_name?: string;
  role?: "admin" | "manager" | "warehouse_staff" | "viewer";
  is_active?: boolean;
}

// LoginPayload used by authStore and LoginPage
export interface LoginPayload {
  email: string;
  password: string;
}

// Keep LoginRequest as alias so nothing else breaks
export type LoginRequest = LoginPayload;

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// === Pagination ==============================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// === Categories ==============================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CategoryCreate {
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}

// === Suppliers ===============================================================

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  lead_time_days: number;
  reliability_score: number;
  is_active: boolean;
  created_at: string;
}

export interface SupplierCreate {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  lead_time_days?: number;
  reliability_score?: number;
}

export interface SupplierUpdate {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  lead_time_days?: number;
  reliability_score?: number;
  is_active?: boolean;
}

// === Products ================================================================

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  barcode: string | null;
  category_id: string | null;
  supplier_id: string | null;
  unit_cost: number;
  selling_price: number;
  reorder_point: number;
  reorder_qty: number;
  unit_of_measure: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  supplier?: Supplier;
}

export interface ProductCreate {
  sku: string;
  name: string;
  description?: string;
  barcode?: string;
  category_id?: string;
  supplier_id?: string;
  unit_cost: number;
  selling_price: number;
  reorder_point?: number;
  reorder_qty?: number;
  unit_of_measure?: string;
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  unit_cost?: number;
  selling_price?: number;
  reorder_point?: number;
  reorder_qty?: number;
  is_active?: boolean;
}

// === Inventory ===============================================================

export interface InventoryItem {
  id: string;
  product_id: string;
  warehouse: string;
  quantity: number;
  reserved_qty: number;
  lot_number: string | null;
  expiry_date: string | null;
  updated_at: string;
  product?: Product;
}

export interface InventoryItemCreate {
  product_id: string;
  warehouse: string;
  quantity: number;
  reserved_qty?: number;
  lot_number?: string;
  expiry_date?: string;
}

export interface InventoryItemUpdate {
  quantity?: number;
  reserved_qty?: number;
  lot_number?: string;
  expiry_date?: string;
}

// === Stock Movements =========================================================

export type MovementType = "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT";

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number | null;
  reference_no: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  product?: Product;
}

export interface StockMovementCreate {
  product_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost?: number;
  reference_no?: string;
  notes?: string;
}

// === ML Types ================================================================

export interface ForecastResponse {
  product_id: string;
  model_used: string;
  forecast_horizon: number;
  forecast_data: Record<string, number>;
  confidence_lower: Record<string, number>;
  confidence_upper: Record<string, number>;
  generated_at: string;
  expires_at: string;
}

export interface AnomalyLog {
  id: string;
  product_id: string;
  movement_id: string | null;
  anomaly_score: number;
  is_anomaly: boolean;
  detected_at: string;
  product?: Product;
}

export interface ReorderRecommendation {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  reorder_point: number;
  recommended_qty: number;
  urgency_score: number;
  urgency_label: "critical" | "high" | "medium" | "low" | "ok";
  economic_order_qty: number;
  safety_stock: number;
  supplier_lead_time: number;
}

export interface MLPipelineResult {
  products_processed: number;
  forecasts_generated: number;
  anomalies_detected: number;
  reorder_alerts: number;
  duration_seconds: number;
  run_at: string;
}