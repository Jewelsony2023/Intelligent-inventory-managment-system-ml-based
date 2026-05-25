import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './api';
import type {
  Category, Supplier, Product, InventoryItem,
  StockMovement, PaginatedProducts, PaginatedInventory
} from '../types';

// ── Categories ──────────────────────────────────────────────
export const useCategories = () =>
  useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/categories');
      return data;
    },
  });

// ── Suppliers ────────────────────────────────────────────────
export const useSuppliers = () =>
  useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data } = await api.get('/inventory/suppliers');
      return data;
    },
  });

// ── Products ─────────────────────────────────────────────────
export const useProducts = (params?: {
  page?: number;
  page_size?: number;
  search?: string;
  category_id?: string;
  supplier_id?: string;
}) =>
  useQuery<PaginatedProducts>({
    queryKey: ['products', params],
    queryFn: async () => {
      const { data } = await api.get('/inventory/products', { params });
      return data;
    },
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Product>) => api.post('/inventory/products', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Product> & { id: string }) =>
      api.patch(`/inventory/products/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

// ── Inventory ────────────────────────────────────────────────
export const useInventory = (params?: {
  page?: number;
  page_size?: number;
  warehouse?: string;
  product_id?: string;
}) =>
  useQuery<PaginatedInventory>({
    queryKey: ['inventory', params],
    queryFn: async () => {
      const { data } = await api.get('/inventory/inventory', { params });
      return data;
    },
  });

// ── Stock Movements ──────────────────────────────────────────
export const useMovements = (params?: { product_id?: string; limit?: number }) =>
  useQuery<StockMovement[]>({
    queryKey: ['movements', params],
    queryFn: async () => {
      const { data } = await api.get('/inventory/movements', { params });
      return data;
    },
  });

export const useCreateMovement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      product_id: string;
      movement_type: string;
      quantity: number;
      unit_cost?: number;
      reference_no?: string;
      notes?: string;
    }) => api.post('/inventory/movements', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movements'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
};