import { Link } from "react-router-dom";

export default function Sidebar({ mobile = false, close }: any) {
  return (
    <div
      className={`
        w-64 h-full bg-white dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700
        p-4
        ${mobile ? "relative z-50" : ""}
      `}
    >
      <h1 className="text-xl font-bold mb-6 dark:text-white">
        MyApp
      </h1>

      <nav className="flex flex-col gap-2">
        <NavItem to="/dashboard" label="Dashboard" onClick={close} />
        <NavItem to="/products" label="Produits" onClick={close} />
        <NavItem to="/entries" label="Entrées" onClick={close} />
        <NavItem to="/outputs" label="Sorties" onClick={close} />
        <NavItem to="/inventory" label="Stock" onClick={close} />
      </nav>
    </div>
  );
}

function NavItem({ to, label, onClick }: any) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200"
    >
      {label}
    </Link>
  );
}