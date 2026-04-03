import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { LogOut, LayoutDashboard, Box, ArrowDown, ArrowUp, BarChart3 } from "lucide-react";
import { logout } from "../components/logout";

export default function Sidebar({ mobile = false, close }) {
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    setLoading(true);

    const success = await logout();

    if (success) {
      window.location.href = "/";
    } else {
      setLoading(false);
    }
  };

  return (
    <div
      className={`
        w-64 h-full bg-white border-r border-gray-100
        p-5 flex flex-col justify-between
        ${mobile ? "relative z-50 shadow-xl" : ""}
      `}
    >
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 mb-8 tracking-tight">
          MyApp
        </h1>

        {/* NAV */}
        <nav className="flex flex-col gap-2">
          <NavItem to="/dashboard" label="Dashboard" icon={LayoutDashboard} current={location.pathname} onClick={close} />
          <NavItem to="/products" label="Produits" icon={Box} current={location.pathname} onClick={close} />
          <NavItem to="/entries" label="Entrées" icon={ArrowDown} current={location.pathname} onClick={close} />
          <NavItem to="/outputs" label="Sorties" icon={ArrowUp} current={location.pathname} onClick={close} />
          <NavItem to="/inventory" label="Stock" icon={BarChart3} current={location.pathname} onClick={close} />
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
            bg-red-500 hover:bg-red-600
            text-white font-medium
            py-2.5 rounded-lg
            transition duration-200 shadow-sm
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

function NavItem({ to, label, icon: Icon, current, onClick }) {
  const isActive = current === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
        transition-all duration-200
        ${isActive
          ? "bg-indigo-50 text-indigo-600"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
      `}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}