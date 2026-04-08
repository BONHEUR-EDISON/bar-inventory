// src/components/Sidebar.tsx
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import {
  LogOut,
  LayoutDashboard,
  Box,
  ArrowDown,
  ArrowUp,
  BarChart3,
  ShoppingCart,
  Clock,
  User
} from "lucide-react";
import { logout } from "../components/logout";
import { useDarkMode } from "../hooks/useDarkMode";

interface SidebarProps {
  mobile?: boolean;
  close?: () => void;
}

export default function Sidebar({ mobile = false, close }: SidebarProps) {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { dark } = useDarkMode(); // ⚡ Hook global, dynamique

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
    <div
      className={`
        h-full flex flex-col justify-between p-5 bg-gray-100 dark:bg-gray-900
        ${mobile ? "relative z-50 w-[80vw] max-w-[288px] shadow-xl" : "w-64 lg:w-72"}
        border-r ${dark ? "border-gray-700 bg-gray-900" : "border-gray-100 bg-white"}
      `}
    >
      <div>
        <h1 className={`text-2xl font-extrabold mb-8 tracking-tight ${dark ? "text-white" : "text-gray-800"}`}>
          Bar Inventory
        </h1>

        <nav className="flex flex-col gap-2">
          <NavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} current={location.pathname} onClick={close} />
          <NavItem to="/clients" label="Clients" icon={User} current={location.pathname} onClick={close} />
          <NavItem to="/products" label="Produits" icon={Box} current={location.pathname} onClick={close} />
          <NavItem to="/entries" label="Entrées" icon={ArrowDown} current={location.pathname} onClick={close} />
          <NavItem to="/outputs" label="Sorties" icon={ArrowUp} current={location.pathname} onClick={close} />
          <NavItem to="/inventory" label="Stock" icon={BarChart3} current={location.pathname} onClick={close} />
          <NavItem to="/InventoryHistory" label="Historique" icon={Clock} current={location.pathname} onClick={close} />
          <NavItem to="/pos" label="Point de Vente" icon={ShoppingCart} current={location.pathname} onClick={close} />
          <NavItem to="/Dettes" label="Dettes" icon={BarChart3} current={location.pathname} onClick={close} />
          
        </nav>
      </div>

      <div>
        <button
          onClick={() => {
            if (close) close();
            handleLogout();
          }}
          disabled={loading}
          className={`
            w-full flex items-center justify-center gap-2
            ${dark ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"}
            font-medium py-2.5 rounded-lg transition duration-200 shadow-sm
            ${loading ? "opacity-60 cursor-not-allowed" : ""}
          `}
        >
          <LogOut size={18} />
          {loading ? "Déconnexion..." : "Se déconnecter"}
        </button>
      </div>
    </div>
  );
}

// ---------------- NavItem ----------------
interface NavItemProps {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  current: string;
  onClick?: () => void;
}

function NavItem({ to, label, icon: Icon, current, onClick }: NavItemProps) {
  const { dark } = useDarkMode(); // ⚡ Chaque NavItem lit le dark mode global
  const isActive = current.toLowerCase() === to.toLowerCase();

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
        transition-all duration-200
        ${isActive
          ? dark
            ? "bg-indigo-700 text-white"
            : "bg-indigo-50 text-indigo-600"
          : dark
          ? "text-gray-300 hover:bg-gray-800 hover:text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }
      `}
    >
      <Icon size={18} />
      <span className="truncate">{label}</span>
    </Link>
  );
}