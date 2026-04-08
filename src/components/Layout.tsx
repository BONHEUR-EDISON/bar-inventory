// src/components/Layout.tsx
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useDarkMode } from "../hooks/useDarkMode";
import PremiumLoader3D from "./PremiumLoader3D";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { dark = false } = useDarkMode();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // ---------------------------
  // Loader route transition
  // ---------------------------
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div
      className={`flex min-h-screen w-full overflow-hidden ${
        dark ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-900"
      }`}
    >
      {/* =========================
          LOADER GLOBAL
      ========================= */}
      <PremiumLoader3D loading={loading} />

      {/* =========================
          SIDEBAR DESKTOP
      ========================= */}
      <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 border-r bg-gray-100 dark:bg-gray-900 transition-colors">
        <Sidebar close={undefined} />
      </aside>

      {/* =========================
          SIDEBAR MOBILE (DRAWER)
      ========================= */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          sidebarOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        {/* Overlay */}
        <div
          onClick={closeSidebar}
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
            sidebarOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drawer */}
        <div
          className={`absolute left-0 top-0 h-full w-[80vw] max-w-[288px] bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar mobile close={closeSidebar} />
        </div>
      </div>

      {/* =========================
          MAIN AREA
      ========================= */}
      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        {/* HEADER sticky */}
        <div className="sticky top-0 z-40 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
          <Header openSidebar={() => setSidebarOpen(true)} />
        </div>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-4 md:px-6 py-4 bg-gray-100 dark:bg-gray-900 transition-colors">
          <div className="max-w-7xl mx-auto w-full">
            {/* wrapper responsive pour tableaux ou images */}
            <div className="overflow-x-auto">{/* Outlet */}
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}