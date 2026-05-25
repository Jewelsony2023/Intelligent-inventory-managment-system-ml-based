import { useState } from 'react';
import { useMovements, useCreateMovement, useProducts } from '../lib/queries';

export default function MovementsPage() {
  const { data: movements, isLoading } = useMovements({ limit: 50 });
  const { data: products } = useProducts({ page_size: 100 });
  const create = useCreateMovement();

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    product_id: '', movement_type: 'IN', quantity: 1,
    unit_cost: 0, reference_no: '', notes: '',
  });

  const handleSubmit = async () => {
    await create.mutateAsync({
      ...form,
      quantity: Number(form.quantity),
      unit_cost: form.unit_cost ? Number(form.unit_cost) : undefined,
    });
    setShowModal(false);
    setForm({ product_id: '', movement_type: 'IN', quantity: 1, unit_cost: 0, reference_no: '', notes: '' });
  };

  const typeColor = (t: string) => {
    const map: Record<string, string> = { IN: '#34d399', OUT: '#f87171', TRANSFER: '#818cf8', ADJUSTMENT: '#f59e0b' };
    return map[t] ?? '#9ca3af';
  };

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f0f0f0', marginBottom: 4 }}>Stock Movements</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>Full transaction history</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '9px 18px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
        >
          + Log Movement
        </button>
      </div>

      <div style={{ background: '#141720', border: '1px solid #1e2130', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2130' }}>
              {['Type', 'Product', 'Qty', 'Ref No', 'Notes', 'Date'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</td></tr>}
            {(movements ?? []).map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid #1e2130' }}>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: typeColor(m.movement_type) + '22', color: typeColor(m.movement_type) }}>
                    {m.movement_type}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: '#d1d5db' }}>{m.product?.name ?? m.product_id.slice(0, 8)}</td>
                <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600, color: m.movement_type === 'OUT' ? '#f87171' : '#34d399' }}>
                  {m.movement_type === 'OUT' ? '-' : '+'}{m.quantity}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{m.reference_no ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af' }}>{m.notes ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#4b5563' }}>{new Date(m.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#141720', border: '1px solid #1e2130', borderRadius: 16, padding: 32, width: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: '#f0f0f0' }}>Log Movement</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20 }}>×</button>
            </div>

            {[
              ['Product', 'product_id', 'select-products'],
              ['Type', 'movement_type', 'select-types'],
              ['Quantity', 'quantity', 'number'],
              ['Unit Cost', 'unit_cost', 'number'],
              ['Reference No', 'reference_no', 'text'],
              ['Notes', 'notes', 'text'],
            ].map(([label, key, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 5 }}>{label}</label>
                {type === 'select-products' ? (
                  <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                    style={{ width: '100%', background: '#0f1117', border: '1px solid #1e2130', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#d1d5db' }}>
                    <option value="">Select product...</option>
                    {(products?.items ?? []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                ) : type === 'select-types' ? (
                  <select value={form.movement_type} onChange={e => setForm(f => ({ ...f, movement_type: e.target.value }))}
                    style={{ width: '100%', background: '#0f1117', border: '1px solid #1e2130', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#d1d5db' }}>
                    {['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER'].map(t => <option key={t}>{t}</option>)}
                  </select>
                ) : (
                  <input type={type} value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                    style={{ width: '100%', background: '#0f1117', border: '1px solid #1e2130', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#d1d5db', boxSizing: 'border-box' as const }}
                  />
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #1e2130', borderRadius: 8, color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!form.product_id || create.isPending}
                style={{ padding: '9px 24px', background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                {create.isPending ? 'Saving...' : 'Log Movement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}