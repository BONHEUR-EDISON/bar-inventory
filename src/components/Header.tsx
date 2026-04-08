// src/components/Header.tsx
import { Menu } from "lucide-react";
import { useDarkMode } from "../hooks/useDarkMode";

interface HeaderProps {
  openSidebar: () => void;
  title?: string; // optionnel pour changer le titre dynamique
}

export default function Header({ openSidebar, title = "Dashboard" }: HeaderProps) {
  const { dark, setDark } = useDarkMode();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md">
      {/* LEFT */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger mobile */}
        <button
          className="md:hidden p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          onClick={openSidebar}
        >
          <Menu className={dark ? "text-white" : "text-gray-800"} />
        </button>
        {/* Title */}
        <h2 className={`font-semibold text-lg sm:text-xl truncate flex-1 min-w-0 ${dark ? "text-white" : "text-gray-800"}`}>
          {title}
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