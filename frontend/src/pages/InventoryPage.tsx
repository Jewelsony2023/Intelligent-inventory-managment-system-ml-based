import { useState } from 'react';
import { useInventory } from '../lib/queries';
import type { InventoryItem } from '../types';

const stockBadge = (item: InventoryItem) => {
  const rp = item.product?.reorder_point ?? 0;
  const q = item.quantity;
  if (q === 0) return { label: 'Out of Stock', color: '#f87171', bg: '#f8717122' };
  if (rp > 0 && q <= rp) return { label: 'Low Stock', color: '#f59e0b', bg: '#f59e0b22' };
  return { label: 'Healthy', color: '#34d399', bg: '#34d39922' };
};

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [warehouse, setWarehouse] = useState('');
  const { data, isLoading } = useInventory({ page, page_size: 15, warehouse: warehouse || undefined });

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f0f0f0', marginBottom: 4 }}>Inventory</h1>
          <p style={{ fontSize: 14, color: '#6b7280' }}>{data?.total ?? 0} stock lines across all warehouses</p>
        </div>
        <input
          placeholder="Filter by warehouse..."
          value={warehouse}
          onChange={e => { setWarehouse(e.target.value); setPage(1); }}
          style={{
            background: '#141720', border: '1px solid #1e2130', borderRadius: 8,
            padding: '9px 14px', fontSize: 13, color: '#d1d5db', width: 220,
          }}
        />
      </div>

      <div style={{ background: '#141720', border: '1px solid #1e2130', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2130' }}>
              {['Product', 'SKU', 'Warehouse', 'Qty', 'Reserved', 'Status', 'Last Updated'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Loading...</td></tr>
            )}
            {(data?.items ?? []).map(item => {
              const badge = stockBadge(item);
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #1e2130' }}>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#d1d5db' }}>{item.product?.name ?? '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{item.product?.sku ?? '—'}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#9ca3af' }}>{item.warehouse}</td>
                  <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#f0f0f0' }}>{item.quantity}</td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{item.reserved_qty}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: '#4b5563' }}>{new Date(item.updated_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {(data?.pages ?? 0) > 1 && (
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #1e2130' }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Page {page} of {data?.pages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #1e2130', borderRadius: 6, color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page === data?.pages}
                style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #1e2130', borderRadius: 6, color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}