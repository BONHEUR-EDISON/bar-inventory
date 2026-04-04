import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Entries from "./pages/Entries";
import Outputs from "./pages/Outputs";
import Expenses from "./pages/Expenses";
import Inventory from "./pages/Inventory";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Prompt pour mise à jour SW
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        if (reg.waiting) setWaitingWorker(reg.waiting);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
            }
          });
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  };

  return (
    <BrowserRouter>
      {/* Bouton mise à jour SW */}
      {waitingWorker && (
        <div style={{ position: "fixed", bottom: 10, right: 10, background: "#4f46e5", color: "#fff", padding: "1rem", borderRadius: "0.5rem", zIndex: 9999 }}>
          <span>Nouvelle version disponible ! </span>
          <button onClick={handleUpdate} style={{ marginLeft: 10, background: "#fff", color: "#4f46e5", padding: "0.3rem 0.6rem", borderRadius: 4 }}>Mettre à jour</button>
        </div>
      )}

      <Routes>
        {/* Page publique */}
        <Route path="/" element={<Login />} />

        {/* Routes protégées */}
        <Route
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

        {/* Fallback */}
        <Route path="*" element={<div>Page non trouvée</div>} />
      </Routes>
    </BrowserRouter>
  );
}