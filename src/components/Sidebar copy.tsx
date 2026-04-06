// src/components/Sidebar.tsx
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { LogOut, LayoutDashboard, Box, ArrowDown, ArrowUp, BarChart3 } from "lucide-react";
import { logout } from "../components/logout";
import { useDarkMode } from "../hooks/useDarkMode";
import { motion } from "framer-motion";

// ---------------- Sidebar Props ----------------
interface SidebarProps {
  mobile?: boolean;
  close?: () => void;
  collapsed?: boolean; // pour desktop collapsible
}

// ---------------- Sidebar Component ----------------
export default function Sidebar({ mobile = false, close, collapsed = false }: SidebarProps) {
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { dark } = useDarkMode();

  const handleLogout = async () => {
    setLoading(true);
    const success = await logout();
    if (success) {
      window.location.href = "/";
    } else {
      setLoading(false);
    }
  };

  // Framer motion variants
  const sidebarVariants = {
    open: { width: "16rem", transition: { type: "spring", stiffness: 200 } },
    collapsed: { width: "5rem", transition: { type: "spring", stiffness: 200 } },
    mobile: { width: "16rem", transition: { type: "spring", stiffness: 200 } },
  };

  const isDesktop = !mobile;

  return (
    <motion.div
      initial={{ width: collapsed ? "5rem" : "16rem" }}
      animate={mobile ? "mobile" : collapsed ? "collapsed" : "open"}
      variants={sidebarVariants}
      className={`
        h-full flex flex-col justify-between p-5
        ${dark ? "bg-gray-900 text-gray-200 border-r border-gray-700" : "bg-white text-gray-800 border-r border-gray-100"}
        ${mobile ? "fixed z-50 shadow-xl" : "relative"}
      `}
    >
      {/* HEADER */}
      <div>
        <h1 className={`text-2xl font-extrabold mb-8 tracking-tight ${dark ? "text-white" : "text-gray-800"} ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          MyApp
        </h1>

        {/* NAV */}
        <nav className="flex flex-col gap-2">
          <NavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} current={location.pathname} onClick={close} dark={dark} collapsed={collapsed} />
          <NavItem to="/products" label="Produits" icon={Box} current={location.pathname} onClick={close} dark={dark} collapsed={collapsed} />
          <NavItem to="/entries" label="Entrées" icon={ArrowDown} current={location.pathname} onClick={close} dark={dark} collapsed={collapsed} />
          <NavItem to="/outputs" label="Sorties" icon={ArrowUp} current={location.pathname} onClick={close} dark={dark} collapsed={collapsed} />
          <NavItem to="/inventory" label="Stock" icon={BarChart3} current={location.pathname} onClick={close} dark={dark} collapsed={collapsed} />
        </nav>
      </div>

      {/* LOGOUT */}
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
          {!collapsed && (loading ? "Déconnexion..." : "Se déconnecter")}
        </button>
      </div>
    </motion.div>
  );
}

// ---------------- NavItem Props ----------------
interface NavItemProps {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  current: string;
  onClick?: () => void;
  dark: boolean;
  collapsed?: boolean;
}

// ---------------- NavItem Component ----------------
function NavItem({ to, label, icon: Icon, current, onClick, dark, collapsed = false }: NavItemProps) {
  const isActive = current === to;

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
      title={collapsed ? label : undefined} // tooltip si réduit
    >
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
      {isActive && !collapsed && (
        <span className="ml-auto inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span> // badge dynamique
      )}
    </Link>
  );
}