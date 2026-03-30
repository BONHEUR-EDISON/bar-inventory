import { Menu } from "lucide-react";
import { useDarkMode } from "../hooks/useDarkMode";

export default function Header({ openSidebar }: any) {
  const { dark, setDark } = useDarkMode();

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <button
          className="md:hidden"
          onClick={openSidebar}
        >
          <Menu />
        </button>
        <h2 className="font-semibold dark:text-white">
          Dashboard
        </h2>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setDark(!dark)}
          className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
        >
          {dark ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}