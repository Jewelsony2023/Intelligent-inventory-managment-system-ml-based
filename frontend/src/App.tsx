import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import ProductsPage from "./pages/ProductsPage";
import MovementsPage from "./pages/MovementsPage";
import SuppliersPage from "./pages/SuppliersPage";
import MLInsightsPage from "./pages/MLInsightsPage";
import UsersPage from "./pages/UsersPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="movements" element={<MovementsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="ml-insights" element={<MLInsightsPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}