import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  useReorderRecommendations,
  useForecast,
  useAnomalies,
  useRunPipeline,
} from "../lib/queries";
import type { ReorderRecommendation, AnomalyLog } from "../types";

// ─── Urgency helpers ──────────────────────────────────────────────────────────
const URGENCY_CFG = {
  critical: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/40", dot: "bg-red-500" },
  high: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/40", dot: "bg-orange-500" },
  medium: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/40", dot: "bg-yellow-500" },
  low: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/40", dot: "bg-blue-400" },
  ok: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/40", dot: "bg-emerald-500" },
};

function UrgencyBadge({ label }: { label: ReorderRecommendation["urgency_label"] }) {
  const cfg = URGENCY_CFG[label];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {label.toUpperCase()}
    </span>
  );
}

// ─── Reorder card ─────────────────────────────────────────────────────────────
function ReorderCard({
  item,
  selected,
  onClick,
}: {
  item: ReorderRecommendation;
  selected: boolean;
  onClick: () => void;
}) {
  const stockPct = Math.min(
    100,
    Math.round((item.current_stock / Math.max(item.reorder_point * 2, 1)) * 100)
  );
  const barColor =
    item.urgency_label === "critical"
      ? "bg-red-500"
      : item.urgency_label === "high"
      ? "bg-orange-500"
      : item.urgency_label === "medium"
      ? "bg-yellow-500"
      : "bg-emerald-500";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        selected
          ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10"
          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-medium text-white text-sm truncate">{item.product_name}</p>
          <p className="text-xs text-white/40 font-mono mt-0.5">{item.sku}</p>
        </div>
        <UrgencyBadge label={item.urgency_label} />
      </div>

      {/* Stock bar */}
      <div className="mb-3">
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${stockPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Stock" value={item.current_stock} />
        <Stat label="Reorder at" value={item.reorder_point} />
        <Stat label="Order qty" value={item.recommended_qty} highlight />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniStat label="Days left" value={item.days_of_stock_remaining.toFixed(1)} />
        <MiniStat label="Avg demand/day" value={item.avg_daily_demand.toFixed(1)} />
      </div>
    </button>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className={`text-base font-bold ${highlight ? "text-indigo-400" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[10px] text-white/40">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg px-2 py-1.5">
      <p className="text-xs font-semibold text-white/80">{value}</p>
      <p className="text-[10px] text-white/40">{label}</p>
    </div>
  );
}

// ─── Forecast chart ───────────────────────────────────────────────────────────
function ForecastChart({ productId }: { productId: string }) {
  const { data, isLoading, isError } = useForecast(productId);

  if (isLoading)
    return (
      <div className="h-64 flex items-center justify-center">
        <Spinner />
      </div>
    );
  if (isError || !data)
    return (
      <div className="h-64 flex items-center justify-center text-white/40 text-sm">
        Failed to load forecast.
      </div>
    );

  const chartData = data.forecast.values.map((v, i) => ({
    day: `D+${i + 1}`,
    forecast: Math.round(v),
    lower: Math.round(data.forecast.confidence_lower[i] ?? v),
    upper: Math.round(data.forecast.confidence_upper[i] ?? v),
  }));

  const MODEL_LABELS: Record<string, string> = {
    arima: "ARIMA",
    holt_winters: "Holt-Winters",
    croston: "Croston",
    moving_average: "Moving Avg",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-base font-semibold text-white">{data.product_name}</h3>
          <p className="text-xs text-white/40 font-mono">{data.sku}</p>
        </div>
        <div className="text-right">
          <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
            {MODEL_LABELS[data.forecast.model_used] ?? data.forecast.model_used}
          </span>
          <p className="text-[10px] text-white/30 mt-1">{data.forecast.model_selection_reason}</p>
        </div>
      </div>

      {/* Reorder reasoning callout */}
      <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 leading-relaxed">
        {data.reorder.reasoning}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="ci" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="day"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#1e1e2e",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              fontSize: 12,
              color: "#e2e8f0",
            }}
            labelStyle={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}
          />
          {/* Confidence band */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="url(#ci)"
            fillOpacity={1}
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="#1e1e2e"
            fillOpacity={1}
          />
          {/* Forecast line */}
          <Area
            type="monotone"
            dataKey="forecast"
            stroke="#818cf8"
            strokeWidth={2}
            fill="url(#fc)"
            dot={false}
            activeDot={{ r: 4, fill: "#818cf8" }}
          />
          {/* Reorder point reference */}
          <ReferenceLine
            y={data.reorder.reorder_point}
            stroke="#f97316"
            strokeDasharray="4 4"
            label={{
              value: `Reorder: ${data.reorder.reorder_point}`,
              fill: "#f97316",
              fontSize: 10,
              position: "insideTopRight",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Current stock", value: data.reorder.current_stock },
          { label: "Safety stock", value: data.reorder.safety_stock },
          { label: "Anomalies", value: data.anomalies.anomaly_count },
          { label: "Urgency score", value: `${(data.reorder.urgency_score * 100).toFixed(0)}%` },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-white">{s.value}</p>
            <p className="text-[10px] text-white/40">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Anomaly feed ─────────────────────────────────────────────────────────────
function AnomalyFeed() {
  const { data, isLoading, isError } = useAnomalies();

  if (isLoading)
    return (
      <div className="h-40 flex items-center justify-center">
        <Spinner />
      </div>
    );
  if (isError || !data)
    return (
      <div className="h-40 flex items-center justify-center text-white/40 text-sm">
        Failed to load anomalies.
      </div>
    );
  if (data.length === 0)
    return (
      <div className="h-40 flex items-center justify-center text-white/30 text-sm">
        No anomalies detected.
      </div>
    );

  return (
    <div className="overflow-auto max-h-80">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-white/30 text-xs border-b border-white/10">
            <th className="pb-2 pr-4 font-medium">Product</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Qty</th>
            <th className="pb-2 pr-4 font-medium">Score</th>
            <th className="pb-2 font-medium">Detected</th>
          </tr>
        </thead>
        <tbody>
          {data.map((a: AnomalyLog) => (
            <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="py-2.5 pr-4">
                <p className="text-white/80 font-medium text-xs truncate max-w-[120px]">
                  {a.product_name}
                </p>
                <p className="text-white/30 font-mono text-[10px]">{a.product_sku}</p>
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    a.movement_type === "IN"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {a.movement_type}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-white/70 text-xs">{a.movement_quantity}</td>
              <td className="py-2.5 pr-4">
                <ScoreBar score={a.anomaly_score} />
              </td>
              <td className="py-2.5 text-white/30 text-xs">
                {new Date(a.detected_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score * 100));
  const color =
    pct > 75 ? "bg-red-500" : pct > 50 ? "bg-orange-500" : pct > 25 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-white/40">{(score).toFixed(3)}</span>
    </div>
  );
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({
  msg,
  type,
  onClose,
}: {
  msg: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium transition-all duration-300 ${
        type === "success"
          ? "bg-emerald-900/90 border-emerald-500/40 text-emerald-300"
          : "bg-red-900/90 border-red-500/40 text-red-300"
      }`}
    >
      <span>{type === "success" ? "✓" : "✕"}</span>
      {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        ×
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MLInsightsPage() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { data: reorderData, isLoading: reorderLoading } = useReorderRecommendations();
  const runPipeline = useRunPipeline();

  // Get user role from auth store for admin check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (window as any).__inventoryIQRole as string | undefined;

  // Try to read role from localStorage token (JWT sub/role)
  // We just check if the admin button should show — use a try/catch
  let isAdmin = false;
  try {
    const token = localStorage.getItem("access_token") ?? sessionStorage.getItem("access_token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      isAdmin = payload.role === "admin";
    }
  } catch {
    // ignore
  }
  // Fallback: show button for all if can't determine (backend enforces the permission)
  if (!role) isAdmin = true;

  async function handleRunPipeline() {
    try {
      const result = await runPipeline.mutateAsync(undefined as never);
      setToast({
        msg: `Pipeline complete — ${result.products_processed} products processed in ${result.duration_seconds?.toFixed(1) ?? "?"}s`,
        type: "success",
      });
    } catch {
      setToast({ msg: "Pipeline failed. Check backend logs.", type: "error" });
    }
  }

  // Auto-select first critical/high item
  if (!selectedProductId && reorderData && reorderData.length > 0) {
    const first = reorderData.find((r) => r.urgency_label !== "ok") ?? reorderData[0];
    setSelectedProductId(first.product_id);
  }

  const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3, ok: 4 };
  const sorted = reorderData
    ? [...reorderData].sort(
        (a, b) => urgencyOrder[a.urgency_label] - urgencyOrder[b.urgency_label]
      )
    : [];

  return (
    <div className="min-h-screen bg-[#0f0f1a] p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">ML Insights</h1>
          <p className="text-sm text-white/40 mt-0.5">
            Demand forecasting · Anomaly detection · Reorder intelligence
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleRunPipeline}
            disabled={runPipeline.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            {runPipeline.isPending ? (
              <>
                <Spinner />
                Running…
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Run Pipeline
              </>
            )}
          </button>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Reorder panel — left column */}
        <div className="col-span-12 lg:col-span-4">
          <SectionCard
            title="Reorder Recommendations"
            subtitle={
              sorted.length > 0
                ? `${sorted.filter((r) => r.urgency_label !== "ok").length} items need attention`
                : undefined
            }
          >
            {reorderLoading ? (
              <div className="h-40 flex items-center justify-center">
                <Spinner />
              </div>
            ) : sorted.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-white/30 text-sm">
                No recommendations yet. Run the pipeline.
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {sorted.map((item) => (
                  <ReorderCard
                    key={item.product_id}
                    item={item}
                    selected={selectedProductId === item.product_id}
                    onClick={() => setSelectedProductId(item.product_id)}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
          {/* Forecast chart */}
          <SectionCard
            title="30-Day Demand Forecast"
            subtitle={
              selectedProductId
                ? "Click any product on the left to update"
                : "Select a product to view forecast"
            }
          >
            {selectedProductId ? (
              <ForecastChart productId={selectedProductId} />
            ) : (
              <div className="h-64 flex items-center justify-center text-white/30 text-sm">
                ← Select a product to view its forecast
              </div>
            )}
          </SectionCard>

          {/* Anomaly feed */}
          <SectionCard
            title="Anomaly Feed"
            subtitle="Recent flagged stock movements"
          >
            <AnomalyFeed />
          </SectionCard>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
