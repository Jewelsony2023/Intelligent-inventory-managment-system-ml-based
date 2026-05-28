import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { api } from "../lib/api";

// ---- Types ----
interface DashboardStats {
  total_products: number;
  low_stock_count: number;
  total_categories: number;
  total_value: number;
}

interface Movement {
  id: string;
  movement_type: string; // "IN" | "OUT"
  quantity: number;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  product_count?: number;
}

interface Product {
  id: string;
  category_id: string | null;
}

interface ProductsResponse {
  items: Product[];
  total: number;
}

interface InventoryItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: { name: string; reorder_point: number };
}

interface InventoryResponse {
  items: InventoryItem[];
}

// ---- Hooks ----
function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [productsRes, inventoryRes, categoriesRes] = await Promise.all([
        api.get<ProductsResponse>("/inventory/products?size=100"),
        api.get<InventoryResponse>("/inventory/inventory?size=100"),
        api.get<Category[]>("/inventory/categories"),
      ]);
      const lowStockCount = inventoryRes.data.items.filter((item) => {
        const reorderPoint = item.product?.reorder_point ?? 0;
        return reorderPoint > 0 && item.quantity <= reorderPoint;
      }).length;
      return {
        total_products: productsRes.data.total,
        low_stock_count: lowStockCount,
        total_categories: categoriesRes.data.length,
        total_value: 0,
      };
    },
  });
}

function useMovements(limit = 200) {
  return useQuery<Movement[]>({
    queryKey: ["movements", limit],
    queryFn: async () => {
      const res = await api.get(`/inventory/movements?limit=${limit}`);
      return res.data;
    },
  });
}

function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/inventory/categories");
      return res.data;
    },
  });
}

function useProducts() {
  return useQuery<ProductsResponse>({
    queryKey: ["products-all"],
    queryFn: async () => {
      const res = await api.get("/inventory/products?size=100");
      return res.data;
    },
  });
}

function useLowStock() {
  return useQuery<InventoryItem[]>({
    queryKey: ["low-stock"],
    queryFn: async () => {
      const res = await api.get<InventoryResponse>("/inventory/inventory?size=100");
      return res.data.items
        .filter((item) => {
          const reorderPoint = item.product?.reorder_point ?? 0;
          return reorderPoint > 0 && item.quantity <= reorderPoint;
        })
        .slice(0, 10);
    },
  });
}

// ---- Chart helpers ----
const CHART_COLORS = [
  "#6366f1",
  "#22d3ee",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#a78bfa",
];

function build7DayData(movements: Movement[]) {
  const days: { date: string; IN: number; OUT: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ date: label, IN: 0, OUT: 0, _key: dateStr } as any);
  }

  for (const m of movements) {
    const mDate = m.created_at.slice(0, 10);
    const slot = (days as any[]).find((d: any) => d._key === mDate);
    if (slot) {
      if (m.movement_type === "IN") slot.IN += m.quantity;
      else if (m.movement_type === "OUT") slot.OUT += m.quantity;
    }
  }

  return days.map(({ _key, ...rest }: any) => rest);
}

function buildCategoryData(
  categories: Category[],
  products: Product[]
) {
  return categories.map((cat) => ({
    name: cat.name,
    value: products.filter((p) => p.category_id === cat.id).length,
  }));
}

// ---- Stat Card ----
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-2">
      <span className={`text-xs font-semibold uppercase tracking-widest ${accent}`}>
        {label}
      </span>
      <span className="text-3xl font-bold text-white">{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

// ---- Main Component ----
export default function DashboardPage() {
  const stats = useDashboardStats();
  const movementsQ = useMovements(200);
  const categoriesQ = useCategories();
  const productsQ = useProducts();
  const lowStockQ = useLowStock();

  const movements: Movement[] = movementsQ.data ?? [];
  const categories: Category[] = categoriesQ.data ?? [];
  const products: Product[] = productsQ.data?.items ?? [];
  const lowStockItems: InventoryItem[] = lowStockQ.data ?? [];

  const barData = build7DayData(movements);
  const pieData = buildCategoryData(categories, products);

  const isLoading =
    stats.isLoading ||
    movementsQ.isLoading ||
    categoriesQ.isLoading ||
    productsQ.isLoading;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Inventory IQ - Operations Overview
        </p>
      </div>

      {/* Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 h-24 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Total Products"
            value={stats.data?.total_products ?? products.length}
            sub="Active SKUs"
            accent="text-indigo-400"
          />
          <StatCard
            label="Low Stock"
            value={stats.data?.low_stock_count ?? lowStockItems.length}
            sub="Below reorder point"
            accent="text-rose-400"
          />
          <StatCard
            label="Categories"
            value={stats.data?.total_categories ?? categories.length}
            sub="Product groups"
            accent="text-cyan-400"
          />
          <StatCard
            label="Movements (7d)"
            value={movements.filter((m) => {
              const d = new Date(m.created_at);
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - 7);
              return d >= cutoff;
            }).length}
            sub="Stock events"
            accent="text-amber-400"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Bar Chart - 7 day movements */}
        <div className="lg:col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-4">
            Stock Movements - Last 7 Days
          </h2>
          {movementsQ.isLoading ? (
            <div className="h-52 animate-pulse bg-gray-800 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={barData}
                margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#6b7280", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#f9fafb",
                  }}
                  cursor={{ fill: "rgba(99,102,241,0.08)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#9ca3af" }}
                />
                <Bar
                  dataKey="IN"
                  fill="#6366f1"
                  radius={[3, 3, 0, 0]}
                  name="Stock In"
                />
                <Bar
                  dataKey="OUT"
                  fill="#f43f5e"
                  radius={[3, 3, 0, 0]}
                  name="Stock Out"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie Chart - categories */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-widest mb-4">
            Products by Category
          </h2>
          {categoriesQ.isLoading || productsQ.isLoading ? (
            <div className="h-52 animate-pulse bg-gray-800 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#f9fafb",
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-gray-900 border border-rose-900/50 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-rose-400 uppercase tracking-widest mb-4">
            Low Stock Alerts
          </h2>
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-gray-950 rounded-lg px-4 py-3"
              >
                <span className="text-sm text-gray-200">
                  {item.product?.name ?? item.product_id}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    Reorder: {item.product?.reorder_point ?? 0}
                  </span>
                  <span className="text-sm font-bold text-rose-400">
                    {item.quantity} left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
