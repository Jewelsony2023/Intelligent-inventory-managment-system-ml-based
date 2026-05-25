import { useProducts, useInventory, useMovements } from '../lib/queries';

const fmt = (n: number) => n.toLocaleString();
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const { data: products } = useProducts({ page_size: 100 });
  const { data: inventory } = useInventory({ page_size: 100 });
  const { data: movements } = useMovements({ limit: 10 });

  const totalItems = inventory?.total ?? 0;
  const totalProducts = products?.total ?? 0;

  const stockValue = (inventory?.items ?? []).reduce((sum, item) => {
    const cost = item.product?.unit_cost ?? 0;
    return sum + item.quantity * cost;
  }, 0);

  const lowStock = (inventory?.items ?? []).filter(item => {
    const rp = item.product?.reorder_point ?? 0;
    return item.quantity <= rp;
  });

  const kpis = [
    { label: 'Total Products', value: fmt(totalProducts), color: '#818cf8' },
    { label: 'Total Stock Lines', value: fmt(totalItems), color: '#34d399' },
    { label: 'Stock Value', value: money(stockValue), color: '#f59e0b' },
    { label: 'Low Stock Alerts', value: fmt(lowStock.length), color: '#f87171' },
  ];

  const movementColor = (type: string) => {
    if (type === 'IN') return '#34d399';
    if (type === 'OUT') return '#f87171';
    if (type === 'ADJUSTMENT') return '#f59e0b';
    return '#818cf8';
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f0f0f0', marginBottom: 8 }}>Dashboard</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32 }}>Real-time snapshot of your warehouse operations</p>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
        {kpis.map(({ label, value, color }) => (
          <div key={label} style={{
            background: '#141720', border: '1px solid #1e2130',
            borderRadius: 12, padding: '20px 24px',
          }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Low Stock Alerts */}
        <div style={{ background: '#141720', border: '1px solid #1e2130', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0', marginBottom: 4 }}>Low Stock Alerts</h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>{lowStock.length} items below reorder point</p>
          {lowStock.length === 0 && (
            <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>All stock levels healthy ✓</p>
          )}
          {lowStock.map(item => {
            const rp = item.product?.reorder_point ?? 0;
            const pct = Math.min(100, (item.quantity / Math.max(rp, 1)) * 100);
            const isCritical = item.quantity === 0 || (rp > 0 && item.quantity / rp < 0.3);
            return (
              <div key={item.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #1e2130' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#d1d5db' }}>{item.product?.name ?? 'Unknown'}</span>
                  <span style={{ fontSize: 12, color: isCritical ? '#f87171' : '#f59e0b', fontWeight: 500 }}>
                    {item.quantity} / {rp} min
                  </span>
                </div>
                <div style={{ height: 4, background: '#1e2130', borderRadius: 4 }}>
                  <div style={{
                    height: 4, borderRadius: 4,
                    width: `${pct}%`,
                    background: isCritical ? '#f87171' : '#f59e0b',
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{item.warehouse}</div>
              </div>
            );
          })}
        </div>

        {/* Recent Movements */}
        <div style={{ background: '#141720', border: '1px solid #1e2130', borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0', marginBottom: 4 }}>Recent Movements</h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 20 }}>Last 10 stock transactions</p>
          {(movements ?? []).map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                  background: movementColor(m.movement_type) + '22',
                  color: movementColor(m.movement_type),
                }}>
                  {m.movement_type}
                </span>
                <span style={{ fontSize: 13, color: '#d1d5db' }}>{m.product?.name ?? m.product_id.slice(0, 8)}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: '#f0f0f0', fontWeight: 500 }}>
                  {m.movement_type === 'OUT' ? '-' : '+'}{m.quantity}
                </div>
                <div style={{ fontSize: 11, color: '#4b5563' }}>{new Date(m.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}