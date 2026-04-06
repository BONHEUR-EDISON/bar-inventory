/* eslint-disable react-hooks/set-state-in-effect */
// src/components/Layout.tsx

import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useDarkMode } from "../hooks/useDarkMode";
import PremiumLoader3D from "./PremiumLoader3D";

export default function Layout() {
  const [open, setOpen] = useState(false);
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

  const handleClose = () => setOpen(false);

  return (
    <div
      className={`
        flex 
        min-h-screen 
        w-full 
        overflow-hidden 
        ${dark ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-900"}
      `}
    >
      {/* =========================
          LOADER GLOBAL
      ========================= */}
      <PremiumLoader3D loading={loading} />

      {/* =========================
          SIDEBAR DESKTOP
      ========================= */}
      <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 border-r border-gray-200 dark:border-gray-800">
        <Sidebar close={undefined} />
      </aside>

      {/* =========================
          SIDEBAR MOBILE (iOS STYLE)
      ========================= */}
      <div
        className={`
          fixed inset-0 z-50 md:hidden
          transition-all duration-300
          ${open ? "pointer-events-auto" : "pointer-events-none"}
        `}
      >
        {/* Overlay */}
        <div
          onClick={handleClose}
          className={`
            absolute inset-0 
            bg-black/40 backdrop-blur-sm
            transition-opacity duration-300
            ${open ? "opacity-100" : "opacity-0"}
          `}
        />

        {/* Drawer */}
        <div
          className={`
            absolute left-0 top-0 h-full w-72
            bg-white dark:bg-gray-900
            shadow-xl
            transform transition-transform duration-300
            ${open ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <Sidebar mobile close={handleClose} />
        </div>
      </div>

      {/* =========================
          MAIN AREA
      ========================= */}
      <div className="flex flex-col flex-1 min-h-screen overflow-hidden">
        
        {/* HEADER sticky iOS */}
        <div className="sticky top-0 z-40 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800">
          <Header openSidebar={() => setOpen(true)} />
        </div>

        {/* CONTENT */}
        <main
          className="
            flex-1 
            overflow-y-auto 
            overflow-x-hidden
            p-4 md:p-6
          "
        >
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}