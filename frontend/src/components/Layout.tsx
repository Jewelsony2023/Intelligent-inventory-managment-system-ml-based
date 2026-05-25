import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const navItems = [
  { to: '/dashboard', icon: '⬛', label: 'Dashboard' },
  { to: '/products',  icon: '📦', label: 'Products' },
  { to: '/inventory', icon: '🗄️', label: 'Inventory' },
  { to: '/movements', icon: '↕️', label: 'Movements' },
  { to: '/suppliers', icon: '🏭', label: 'Suppliers' },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0f1117', color: '#e8e8e8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: '#141720',
        borderRight: '1px solid #1e2130',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 28px', borderBottom: '1px solid #1e2130' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff',
            }}>IQ</div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#f0f0f0' }}>Inventory IQ</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#818cf8' : '#9ca3af',
                background: isActive ? 'rgba(99,102,241,0.12)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.15s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e2130' }}>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 4 }}>{user?.full_name}</div>
          <div style={{ fontSize: 11, color: '#4b5563', textTransform: 'capitalize', marginBottom: 12 }}>{user?.role?.replace('_', ' ')}</div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '7px 0', fontSize: 13,
              background: 'transparent', border: '1px solid #1e2130',
              borderRadius: 6, color: '#6b7280', cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', background: '#0f1117' }}>
        <Outlet />
      </main>
    </div>
  );
}