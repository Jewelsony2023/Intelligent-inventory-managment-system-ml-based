import { useSuppliers } from '../lib/queries';

export default function SuppliersPage() {
  const { data: suppliers, isLoading } = useSuppliers();

  return (
    <div style={{ padding: '32px 40px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, color: '#f0f0f0', marginBottom: 4 }}>Suppliers</h1>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32 }}>{suppliers?.length ?? 0} active suppliers</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {isLoading && <p style={{ color: '#6b7280' }}>Loading...</p>}
        {(suppliers ?? []).map(s => (
          <div key={s.id} style={{ background: '#141720', border: '1px solid #1e2130', borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#6366f122', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                🏭
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                background: s.is_active ? '#34d39922' : '#f8717122',
                color: s.is_active ? '#34d399' : '#f87171',
              }}>
                {s.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0', marginBottom: 6 }}>{s.name}</h3>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{s.email}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #1e2130' }}>
              <div>
                <div style={{ fontSize: 10, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lead Time</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#d1d5db' }}>{s.lead_time_days}d</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reliability</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: s.reliability_score >= 8 ? '#34d399' : s.reliability_score >= 5 ? '#f59e0b' : '#f87171' }}>
                  {s.reliability_score}/10
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}