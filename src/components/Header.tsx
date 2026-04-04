// src/components/Header.tsx
import { Menu } from "lucide-react";
import { useDarkMode } from "../hooks/useDarkMode";

interface HeaderProps {
  openSidebar: () => void; // Typage strict
}

export default function Header({ openSidebar }: HeaderProps) {
  const { dark, setDark } = useDarkMode();

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        {/* Bouton hamburger pour mobile */}
        <button
          className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={openSidebar}
        >
          <Menu className={dark ? "text-white" : "text-gray-800"} />
        </button>
        <h2 className={`font-semibold ${dark ? "text-white" : "text-gray-800"}`}>
          Dashboard
        </h2>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        {/* Toggle dark mode */}
        <button
          onClick={() => setDark(!dark)}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          {dark ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}