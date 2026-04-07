import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Entries from "./pages/Entries";
import Outputs from "./pages/Outputs";
import Expenses from "./pages/Expenses";
import Inventory from "./pages/Inventory";
import InventoryHistory from "./pages/InventoryHistory";
import POS from "./pages/POS";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAutoLogout } from "./hooks/useAutoLogout";
import InstallPWA from "./components/InstallPWA";
import UpdatePWA from "./components/UpdatePWA";

export default function App() {
  useAutoLogout();

  return (
    <BrowserRouter>
      <InstallPWA />
      <UpdatePWA />

      <Routes>
        {/* ✅ Route par défaut */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Page publique */}
        <Route path="/login" element={<Login />} />

        {/* Routes protégées */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/entries" element={<Entries />} />
          <Route path="/outputs" element={<Outputs />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/InventoryHistory" element={<InventoryHistory />} />
          <Route path="/pos" element={<POS />} />

        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}