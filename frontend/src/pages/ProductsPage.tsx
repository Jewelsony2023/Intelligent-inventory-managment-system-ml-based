import { useState } from 'react';
import { useProducts, useCategories, useSuppliers, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../lib/queries';
import type { Product } from '../types';

const emptyForm = {
  sku: '', name: '', description: '', barcode: '',
  category_id: '', supplier_id: '',
  unit_cost: 0, selling_price: 0,
  reorder_point: 10, reorder_qty: 50, unit_of_measure: 'units',
};

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const { data, isLoading } = useProducts({ page, page_size: 15, search: search || undefined });
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const remove = useDeleteProduct();

  const openNew = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      sku: p.sku, name: p.name, description: p.description ?? '',
      barcode: p.barcode ?? '', category_id: p.category_id,
      supplier_id: p.supplier_id, unit_cost: p.unit_cost,
      selling_price: p.selling_price, reorder_point: p.reorder_point,
      reorder_qty: p.reorder_qty, unit_of_measure: p.unit_of_measure,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...form });
    } else {
      await create.mutateAsync(form);
    }
    setShowModal(false);
  };

  const field = (key: keyof typeof emptyForm, label: string, type = 'text') => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5 }}>{label}</label>
      <input
        type={type}
        value={form[key] as string | number}
        onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
        style={{ width: '100%', background: '#0f1117', border: '1px solid #1e2130', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#d1d5db', boxSizing: 'border-box' }}
      />
    </div>
  );

  const selectField = (key: 'category_id' | 'supplier_id', label: string, options: { id: string; name: string }[]) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5 }}>{label}</label>
      <select
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={{ width: '100%', background: '#0f1117', border: '1px solid #1e2130', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#d1d5db', boxSizing: 'border-box' }}
      >
        <option value="">Select {label}...</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f0f0f0', marginBottom: 4 }}>Products</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>{data?.total ?? 0} products in catalogue</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            placeholder="Search products..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ background: '#141720', border: '1px solid #1e2130', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: '#d1d5db', width: 220 }}
          />
          <button
            onClick={openNew}
            style={{ padding: '9px 18px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            + Add Product
          </button>
        </div>
      </div>

      <div style={{ background: '#141720', border: '1px solid #1e2130', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2130' }}>
              {['SKU', 'Name', 'Category', 'Supplier', 'Cost', 'Price', 'Reorder At', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Loading...</td></tr>
            )}
            {(data?.items ?? []).map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #1e2130' }}>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#818cf8', fontFamily: 'monospace' }}>{p.sku}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#d1d5db', fontWeight: 500 }}>{p.name}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af' }}>{p.category?.name ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af' }}>{p.supplier?.name ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#d1d5db' }}>${p.unit_cost.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#34d399' }}>${p.selling_price.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#f59e0b' }}>{p.reorder_point}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => openEdit(p)} style={{ marginRight: 8, padding: '5px 12px', background: 'transparent', border: '1px solid #1e2130', borderRadius: 6, color: '#9ca3af', cursor: 'pointer', fontSize: 12 }}>Edit</button>
                  <button onClick={() => remove.mutate(p.id)} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid #3f1d1d', borderRadius: 6, color: '#f87171', cursor: 'pointer', fontSize: 12 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data?.pages ?? 0) > 1 && (
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e2130' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} of {data?.pages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #1e2130', borderRadius: 6, color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page === data?.pages} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #1e2130', borderRadius: 6, color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#141720', border: '1px solid #1e2130', borderRadius: 16, padding: 32, width: 540, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f0f0f0' }}>{editing ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {field('sku', 'SKU')}
              {field('name', 'Product Name')}
              {field('unit_cost', 'Unit Cost', 'number')}
              {field('selling_price', 'Selling Price', 'number')}
              {field('reorder_point', 'Reorder Point', 'number')}
              {field('reorder_qty', 'Reorder Qty', 'number')}
              {field('unit_of_measure', 'Unit of Measure')}
              {field('barcode', 'Barcode')}
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              {selectField('category_id', 'Category', categories ?? [])}
              {selectField('supplier_id', 'Supplier', suppliers ?? [])}
              {field('description', 'Description')}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #1e2130', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={create.isPending || update.isPending}
                style={{ padding: '9px 24px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              >
                {create.isPending || update.isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}