import { Link } from "react-router-dom";
import {
  Home,
  Box,
  ArrowDown,
  ArrowUp,
  Wallet,
  BarChart3,
  LogOut,
} from "lucide-react";
import { logout } from "../components/logout";
import { useState } from "react";

export default function Navbar() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    const success = await logout();

    if (success) {
      window.location.href = "/login";
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="w-64 bg-black/40 backdrop-blur-xl border-r border-gray-800 p-4 hidden md:flex flex-col justify-between">
      
      {/* TOP MENU */}
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold mb-6">Bar Manager</h1>

        <Link to="/" className="flex items-center gap-2 hover:text-blue-400">
          <Home size={18}/> Dashboard
        </Link>

        <Link to="/products" className="flex items-center gap-2">
          <Box size={18}/> Produits
        </Link>

        <Link to="/entries" className="flex items-center gap-2">
          <ArrowDown size={18}/> Entrées
        </Link>

        <Link to="/outputs" className="flex items-center gap-2">
          <ArrowUp size={18}/> Sorties
        </Link>

        <Link to="/expenses" className="flex items-center gap-2">
          <Wallet size={18}/> Dépenses
        </Link>

        <Link to="/inventory" className="flex items-center gap-2">
          <BarChart3 size={18}/> Inventaire
        </Link>
      </div>

      {/* 🔥 BOTTOM LOGOUT */}
      <div>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 transition text-white px-4 py-2 rounded-lg"
        >
          <LogOut size={18} />
          {loading ? "Déconnexion..." : "Se déconnecter"}
        </button>
      </div>
    </div>
  );
}