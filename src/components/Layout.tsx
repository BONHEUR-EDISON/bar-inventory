// src/components/Layout.tsx
import { Outlet } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useDarkMode } from "../hooks/useDarkMode";

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { darkMode } = useDarkMode();

  const handleClose = () => setOpen(false);

  return (
    <div className={`flex h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Sidebar Desktop */}
      <div className="hidden md:block">
        <Sidebar close={undefined} /> {/* Desktop n'utilise pas close */}
      </div>

      {/* Sidebar Mobile */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />

          {/* Sidebar */}
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