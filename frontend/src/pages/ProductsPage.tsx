import { useState } from "react";
import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "../lib/api";

// ---- Types ----
interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  unit_cost: number;
  selling_price: number;
  category_id: string | null;
  supplier_id: string | null;
  category?: { id: string; name: string };
  supplier?: { id: string; name: string };
  is_active: boolean;
}

interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  pages: number;
}

// ---- Hooks ----
function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/inventory/categories");
      return res.data;
    },
  });
}

function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await api.get("/inventory/suppliers");
      return res.data;
    },
  });
}

function useProducts(params: {
  search: string;
  category_id: string;
  supplier_id: string;
  page: number;
}) {
  const query = new URLSearchParams();
  query.set("size", "20");
  query.set("page", String(params.page));
  if (params.search) query.set("search", params.search);
  if (params.category_id) query.set("category_id", params.category_id);
  if (params.supplier_id) query.set("supplier_id", params.supplier_id);

  return useQuery<ProductsResponse>({
    queryKey: ["products", params],
    queryFn: async () => {
      const res = await api.get(
        `/inventory/products?${query.toString()}`
      );
      return res.data;
    },
    placeholderData: keepPreviousData,
  });
}

// ---- Confirm Delete Modal ----
function ConfirmModal({
  product,
  onConfirm,
  onCancel,
  loading,
}: {
  product: Product;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-semibold text-white">Delete Product</h3>
        <p className="text-gray-400 text-sm">
          Are you sure you want to delete{" "}
          <span className="text-white font-medium">{product.name}</span>? This
          cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Product Form Modal ----
function ProductModal({
  product,
  categories,
  suppliers,
  onClose,
  onSaved,
}: {
  product: Product | null;
  categories: Category[];
  suppliers: Supplier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = product !== null;
  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    description: product?.description ?? "",
    selling_price: product?.selling_price ?? 0,
    category_id: product?.category_id ?? "",
    supplier_id: product?.supplier_id ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set(key: string, val: string | number) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    setError("");
    if (!form.name.trim() || !form.sku.trim()) {
      setError("Name and SKU are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || undefined,
        supplier_id: form.supplier_id || undefined,
      };
      if (isEdit) {
        await api.patch(
          `/inventory/products/${product!.id}`,
          payload
        );
      } else {
        await api.post("/inventory/products", {
          ...payload,
          unit_cost: 0,
        });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ?? "Failed to save product."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg space-y-4">
        <h3 className="text-lg font-semibold text-white">
          {isEdit ? "Edit Product" : "Add Product"}
        </h3>

        {error && (
          <p className="text-rose-400 text-sm bg-rose-950/40 border border-rose-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Name</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">SKU</label>
            <input
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Unit Price
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              value={form.selling_price}
              onChange={(e) => set("selling_price", parseFloat(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Category
            </label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              value={form.category_id}
              onChange={(e) => set("category_id", e.target.value)}
            >
              <option value="">-- Select --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              Supplier
            </label>
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              value={form.supplier_id}
              onChange={(e) => set("supplier_id", e.target.value)}
            >
              <option value="">-- Select --</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">
              Description
            </label>
            <textarea
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [page, setPage] = useState(1);
  const [editProduct, setEditProduct] = useState<Product | null | undefined>(
    undefined
  ); // undefined = closed, null = new, Product = edit
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const categoriesQ = useCategories();
  const suppliersQ = useSuppliers();
  const productsQ = useProducts({
    search,
    category_id: categoryId,
    supplier_id: supplierId,
    page,
  });

  const categories = categoriesQ.data ?? [];
  const suppliers = suppliersQ.data ?? [];
  const products = productsQ.data?.items ?? [];
  const totalPages = productsQ.data?.pages ?? 1;

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/inventory/products/${deleteTarget.id}`);
      qc.invalidateQueries({ queryKey: ["products"] });
      setDeleteTarget(null);
    } catch (e) {
      // silently fail — user can retry
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleCategoryChange(val: string) {
    setCategoryId(val);
    setPage(1);
  }

  function handleSupplierChange(val: string) {
    setSupplierId(val);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">
      {/* Modals */}
      {editProduct !== undefined && (
        <ProductModal
          product={editProduct}
          categories={categories}
          suppliers={suppliers}
          onClose={() => setEditProduct(undefined)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["products"] })}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          product={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-gray-400 text-sm mt-1">
            {productsQ.data?.total ?? 0} total products
          </p>
        </div>
        <button
          onClick={() => setEditProduct(null)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
        >
          + Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 w-64"
        />
        <select
          value={categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={supplierId}
          onChange={(e) => handleSupplierChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {(search || categoryId || supplierId) && (
          <button
            onClick={() => {
              setSearch("");
              setCategoryId("");
              setSupplierId("");
              setPage(1);
            }}
            className="px-3 py-2 text-xs text-gray-400 hover:text-white bg-gray-800 border border-gray-700 rounded-lg"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {productsQ.isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-gray-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-400 text-sm font-medium">No products found</p>
            <p className="text-gray-600 text-xs">Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">SKU</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-medium text-white">
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {p.sku}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {p.category?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {p.supplier?.name ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-200">
                    ${p.selling_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        p.is_active
                          ? "text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-800 rounded-full px-2 py-0.5"
                          : "text-xs bg-gray-800 text-gray-500 border border-gray-700 rounded-full px-2 py-0.5"
                      }
                    >
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditProduct(p)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-950/40"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-950/40"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
