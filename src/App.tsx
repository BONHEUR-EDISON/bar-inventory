import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Entries from "./pages/Entries";
import Outputs from "./pages/Outputs";
import Expenses from "./pages/Expenses";
import Inventory from "./pages/Inventory";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
//import { OrganizationProvider } from "./context/OrganizationProvider";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* page publique */}
        <Route path="/" element={<Login />} />

        {/* toutes les routes protégées avec Layout et ProtectedRoute */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="entries" element={<Entries />} />
          <Route path="outputs" element={<Outputs />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="inventory" element={<Inventory />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<div>Page non trouvée</div>} />
      </Routes>
    </BrowserRouter>
  );
} 