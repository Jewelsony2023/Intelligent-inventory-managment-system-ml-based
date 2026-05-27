import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import type {
  PaginatedResponse,
  User,
  UserCreate,
  UserUpdate,
  Category,
  CategoryCreate,
  CategoryUpdate,
  Supplier,
  SupplierCreate,
  SupplierUpdate,
  Product,
  ProductCreate,
  ProductUpdate,
  InventoryItem,
  InventoryItemCreate,
  InventoryItemUpdate,
  StockMovement,
  StockMovementCreate,
  ForecastResponse,
  AnomalyLog,
  ReorderRecommendation,
  MLPipelineResult,
} from "../types";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
  users: ["users"] as const,
  user: (id: string) => ["users", id] as const,
  categories: ["categories"] as const,
  category: (id: string) => ["categories", id] as const,
  suppliers: ["suppliers"] as const,
  supplier: (id: string) => ["suppliers", id] as const,
  products: (params?: object) => ["products", params] as const,
  product: (id: string) => ["products", id] as const,
  inventory: (params?: object) => ["inventory", params] as const,
  movements: (params?: object) => ["movements", params] as const,
  forecast: (productId: string, horizon?: number) =>
    ["forecast", productId, horizon] as const,
  forecastExplain: (productId: string) =>
    ["forecast", productId, "explain"] as const,
  anomalies: (productId?: string) => ["anomalies", productId] as const,
  reorderRecommendations: ["reorderRecommendations"] as const,
};

// ─── Users ───────────────────────────────────────────────────────────────────

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: async () => {
      const { data } = await api.get<User[]>("/users/");
      return data;
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UserCreate) => {
      const { data } = await api.post<User>("/users/", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UserUpdate;
    }) => {
      const { data } = await api.patch<User>(`/users/${userId}`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
}

// ─── Categories ───────────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: QUERY_KEYS.categories,
    queryFn: async () => {
      const { data } = await api.get<Category[]>("/inventory/categories");
      return data;
    },
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CategoryCreate) => {
      const { data } = await api.post<Category>(
        "/inventory/categories",
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: CategoryUpdate;
    }) => {
      const { data } = await api.patch<Category>(
        `/inventory/categories/${id}`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/categories/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.categories });
    },
  });
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export function useSuppliers() {
  return useQuery({
    queryKey: QUERY_KEYS.suppliers,
    queryFn: async () => {
      const { data } = await api.get<Supplier[]>("/inventory/suppliers");
      return data;
    },
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SupplierCreate) => {
      const { data } = await api.post<Supplier>("/inventory/suppliers", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
    },
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: SupplierUpdate;
    }) => {
      const { data } = await api.patch<Supplier>(
        `/inventory/suppliers/${id}`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
    },
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/suppliers/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
    },
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────

export function useProducts(params?: {
  page?: number;
  size?: number;
  search?: string;
  category_id?: string;
  supplier_id?: string;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.products(params),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Product>>(
        "/inventory/products",
        { params }
      );
      return data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.product(id),
    queryFn: async () => {
      const { data } = await api.get<Product>(`/inventory/products/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ProductCreate) => {
      const { data } = await api.post<Product>("/inventory/products", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ProductUpdate;
    }) => {
      const { data } = await api.patch<Product>(
        `/inventory/products/${id}`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inventory/products/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// ─── Inventory ────────────────────────────────────────────────────────────────

export function useInventory(params?: {
  page?: number;
  size?: number;
  warehouse?: string;
  product_id?: string;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.inventory(params),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<InventoryItem>>(
        "/inventory/inventory",
        { params }
      );
      return data;
    },
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InventoryItemCreate) => {
      const { data } = await api.post<InventoryItem>(
        "/inventory/inventory",
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: InventoryItemUpdate;
    }) => {
      const { data } = await api.patch<InventoryItem>(
        `/inventory/inventory/${id}`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// ─── Movements ────────────────────────────────────────────────────────────────

export function useMovements(params?: {
  product_id?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: QUERY_KEYS.movements(params),
    queryFn: async () => {
      const { data } = await api.get<StockMovement[]>(
        "/inventory/movements",
        { params }
      );
      return data;
    },
  });
}

export function useCreateMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: StockMovementCreate) => {
      const { data } = await api.post<StockMovement>(
        "/inventory/movements",
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// ─── ML ───────────────────────────────────────────────────────────────────────

export function useForecast(productId: string, horizon?: number) {
  return useQuery({
    queryKey: QUERY_KEYS.forecast(productId, horizon),
    queryFn: async () => {
      const { data } = await api.get<ForecastResponse>(
        `/ml/forecast/${productId}`,
        { params: horizon ? { horizon } : undefined }
      );
      return data;
    },
    enabled: !!productId,
  });
}

export function useForecastExplain(productId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.forecastExplain(productId),
    queryFn: async () => {
      const { data } = await api.get(`/ml/forecast/${productId}/explain`);
      return data;
    },
    enabled: !!productId,
  });
}

export function useAnomalies(productId?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.anomalies(productId),
    queryFn: async () => {
      const { data } = await api.get<AnomalyLog[]>("/ml/anomalies", {
        params: productId ? { product_id: productId } : undefined,
      });
      return data;
    },
  });
}

export function useReorderRecommendations() {
  return useQuery({
    queryKey: QUERY_KEYS.reorderRecommendations,
    queryFn: async () => {
      const { data } = await api.get<ReorderRecommendation[]>(
        "/ml/reorder-recommendations"
      );
      return data;
    },
  });
}

export function useRunMLPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<MLPipelineResult>("/ml/run-pipeline");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["anomalies"] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.reorderRecommendations });
    },
  });
}