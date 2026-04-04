// src/components/Layout.tsx
import { Outlet, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useDarkMode } from "../hooks/useDarkMode";
//import PremiumLoader from "./PremiumLoader";
import PremiumLoader3D from "./PremiumLoader3D";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { dark = false } = useDarkMode();
  
  // ---------------------------
  // Loader
  // ---------------------------
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 500); // durée minimale du spinner
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleClose = () => setOpen(false);

  return (
    <div className={`flex h-screen ${dark ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Premium Loader */}
      <PremiumLoader3D loading={loading} />

      {/* Sidebar Desktop */}
      <div className="hidden md:block">
        <Sidebar close={undefined} />
      </div>

      {/* Sidebar Mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />
          <Sidebar mobile close={handleClose} />
        </div>
      )}

      {/* MAIN */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <Header openSidebar={() => setOpen(true)} />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}