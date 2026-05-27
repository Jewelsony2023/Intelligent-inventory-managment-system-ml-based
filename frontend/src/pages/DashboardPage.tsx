import { useMemo } from "react";
import { useProducts, useCategories, useMovements, useReorderRecommendations } from "../lib/queries";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  sub?: string;
  loading?: boolean;
}

function KPICard({ label, value, icon, iconBg, sub, loading }: KPICardProps) {
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-sm">{label}</p>
          {loading ? (
            <div className="mt-2 h-8 w-20 bg-slate-700 rounded animate-pulse" />
          ) : (
            <p className="mt-1 text-3xl font-bold text-white">{value}</p>
          )}
          {sub && !loading && (
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
          )}
        </div>
        <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Low Stock Row ────────────────────────────────────────────────────────────

function LowStockRow({ label, urgency }: { label: string; urgency: string }) {
  const colors: Record<string, string> = {
    critical: "text-red-400 bg-red-500/10 border-red-500/20",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    low: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  };
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-slate-300 text-sm">{label}</span>
      <span className={`text-xs font-medium px-2 py-0.5 rounded border ${colors[urgency] ?? "text-slate-400 bg-slate-700 border-slate-600"}`}>
        {urgency.charAt(0).toUpperCase() + urgency.slice(1)}
      </span>
    </div>
  );
}

// ─── Recent Movements ─────────────────────────────────────────────────────────

const MOVE_COLORS: Record<string, string> = {
  IN: "text-emerald-400 bg-emerald-500/10",
  OUT: "text-red-400 bg-red-500/10",
  TRANSFER: "text-blue-400 bg-blue-500/10",
  ADJUSTMENT: "text-amber-400 bg-amber-500/10",
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: productsData, isLoading: loadingProducts } = useProducts({ page: 1, size: 1 });
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: movements, isLoading: loadingMovements } = useMovements({ limit: 200 });
  const { data: reorderRecs, isLoading: loadingReorder } = useReorderRecommendations();

  // Low stock = recommendations with urgency !== 'ok'
  const lowStockItems = useMemo(
    () => reorderRecs?.filter((r) => r.urgency_label !== "ok") ?? [],
    [reorderRecs]
  );

  // Today's movements — filter client-side by today's date
  const todayMovements = useMemo(() => {
    if (!movements) return [];
    const today = new Date().toDateString();
    return movements.filter(
      (m) => new Date(m.created_at).toDateString() === today
    );
  }, [movements]);

  const recentMovements = movements?.slice(0, 8) ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Live overview of your inventory system
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          label="Total Products"
          value={productsData?.total ?? 0}
          loading={loadingProducts}
          sub="across all categories"
          iconBg="bg-indigo-500/20"
          icon={
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
        />

        <KPICard
          label="Low Stock Alerts"
          value={lowStockItems.length}
          loading={loadingReorder}
          sub={
            lowStockItems.filter((r) => r.urgency_label === "critical").length > 0
              ? `${lowStockItems.filter((r) => r.urgency_label === "critical").length} critical`
              : "no critical items"
          }
          iconBg="bg-red-500/20"
          icon={
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          }
        />

        <KPICard
          label="Movements Today"
          value={todayMovements.length}
          loading={loadingMovements}
          sub="stock transactions"
          iconBg="bg-emerald-500/20"
          icon={
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          }
        />

        <KPICard
          label="Categories"
          value={categories?.length ?? 0}
          loading={loadingCategories}
          sub="product classifications"
          iconBg="bg-amber-500/20"
          icon={
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          }
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Items */}
        <div className="bg-slate-800 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Low Stock Alerts</h2>
            <span className="text-xs text-slate-500">
              {lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          {loadingReorder ? (
            <div className="space-y-2.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              ✓ All stock levels are healthy
            </div>
          ) : (
            <div>
              {lowStockItems.slice(0, 8).map((item) => (
                <LowStockRow
                  key={item.product_id}
                  label={item.product_name}
                  urgency={item.urgency_label}
                />
              ))}
              {lowStockItems.length > 8 && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  +{lowStockItems.length - 8} more in ML Insights
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recent Movements */}
        <div className="bg-slate-800 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Recent Movements</h2>
            <span className="text-xs text-slate-500">Last 8 transactions</span>
          </div>
          {loadingMovements ? (
            <div className="space-y-2.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : recentMovements.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              No movements recorded yet
            </div>
          ) : (
            <div>
              {recentMovements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex-shrink-0 text-xs font-bold px-1.5 py-0.5 rounded ${
                        MOVE_COLORS[m.movement_type] ?? "text-slate-400 bg-slate-700"
                      }`}
                    >
                      {m.movement_type}
                    </span>
                    <span className="text-slate-300 text-sm truncate">
                      {m.product?.name ?? m.product_id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-white text-sm font-medium">
                      ×{m.quantity}
                    </span>
                    <span className="text-slate-500 text-xs">
                      {new Date(m.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}