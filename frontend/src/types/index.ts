export type Permission =
  | 'inventory:read'
  | 'inventory:write'
  | 'inventory:delete'
  | 'product:read'
  | 'product:write'
  | 'product:delete'
  | 'order:read'
  | 'order:write'
  | 'order:approve'
  | 'supplier:read'
  | 'supplier:write'
  | 'analytics:read'
  | 'forecast:read'
  | 'forecast:configure'
  | 'alert:read'
  | 'alert:manage'
  | 'user:read'
  | 'user:write'
  | 'user:delete'
  | 'role:manage'
  | 'audit:read'
  | 'settings:read'
  | 'settings:write';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'warehouse_staff' | 'viewer';
  permissions: Permission[];
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  lead_time_days: number;
  reliability_score: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  barcode: string | null;
  category_id: string;
  supplier_id: string;
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

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';
  quantity: number;
  unit_cost: number | null;
  reference_no: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  product?: Product;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface PaginatedInventory {
  items: InventoryItem[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
// ── ML Types ──────────────────────────────────────────────────────────────────

export interface ForecastResponse {
  product_id: string;
  product_name: string;
  sku: string;
  generated_at: string;
  forecast: {
    model_used: "arima" | "holt_winters" | "croston" | "moving_average";
    horizon_days: number;
    values: number[];
    confidence_lower: number[];
    confidence_upper: number[];
    model_selection_reason: string;
    feature_importance: Record<string, number>;
  };
  anomalies: {
    total_points_analysed: number;
    anomaly_count: number;
    anomaly_indices: number[];
    anomaly_quantities: number[];
    all_scores: number[];
  };
  reorder: {
    current_stock: number;
    available_stock: number;
    reorder_point: number;
    safety_stock: number;
    recommended_qty: number;
    urgency_score: number;
    urgency_label: "critical" | "high" | "medium" | "low" | "ok";
    days_of_stock_remaining: number;
    avg_daily_demand: number;
    reasoning: string;
  };
}

export interface AnomalyLog {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  movement_id: string;
  anomaly_score: number;
  is_anomaly: boolean;
  detected_at: string;
  movement_quantity: number;
  movement_type: "IN" | "OUT";
}

export interface ReorderRecommendation {
  product_id: string;
  product_name: string;
  sku: string;
  current_stock: number;
  available_stock: number;
  reorder_point: number;
  safety_stock: number;
  recommended_qty: number;
  urgency_score: number;
  urgency_label: "critical" | "high" | "medium" | "low" | "ok";
  days_of_stock_remaining: number;
  avg_daily_demand: number;
  reasoning: string;
  forecast_model: string;
}

export interface MLPipelineResult {
  success: boolean;
  products_processed: number;
  errors: string[];
  duration_seconds: number;
}