import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

import { LoginPage } from "./pages/LoginPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { useAuthStore } from "./stores/authStore";
import { tokenStorage } from "./lib/api";

// Lazy-loadable pages (add as you build them)
const DashboardPage = () => <div style={{ padding: "2rem", color: "white" }}>📊 Dashboard — Phase 2</div>;
const InventoryPage = () => <div style={{ padding: "2rem", color: "white" }}>📦 Inventory</div>;
const UsersPage = () => <div style={{ padding: "2rem", color: "white" }}>👥 Users</div>;
const AnalyticsPage = () => <div style={{ padding: "2rem", color: "white" }}>📈 Analytics</div>;
const NotFoundPage = () => <div style={{ padding: "2rem", color: "white" }}>404 — Not found</div>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function AppInitializer() {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    // Rehydrate user on page load if token exists
    if (tokenStorage.getAccess()) {
      fetchMe();
    }
  }, [fetchMe]);

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInitializer />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
