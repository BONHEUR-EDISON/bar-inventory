// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useDarkMode } from "../hooks/useDarkMode";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import toast, { Toaster } from "react-hot-toast";

// 🔹 Types
type Stats = {
  products: number;
  sales: number;
  entries: number;
  revenue: number;
  profit: number;
};

type Activity = {
  id: string;
  message: string;
  date: string;
};

type TopProduct = {
  id: string;
  name: string;
  sold: number;
  revenue: number;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { dark } = useDarkMode(); // juste récupérer dark pour appliquer les classes

  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ products: 0, sales: 0, entries: 0, revenue: 0, profit: 0 });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [chartData, setChartData] = useState<{ date: string; revenue: number }[]>([]);

  const getUserOrganization = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data?.organization_id || null;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const user = userData.user;
        if (userError || !user) return navigate("/");

        const organizationId = await getUserOrganization(user.id);
        if (!organizationId) {
          toast.error("Aucune organisation trouvée !");
          return navigate("/");
        }
        setOrgId(organizationId);

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const productsRes = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organizationId);

        const movementsRes = await supabase
          .from("stock_movements")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: true });

        const sales = movementsRes.data?.filter((m: any) => m.type === "OUT" && new Date(m.created_at) >= startDate) || [];
        const entries = movementsRes.data?.filter((m: any) => m.type === "IN") || [];

        const revenue = sales.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
        const cost = sales.reduce((sum: number, s: any) => sum + (s.unit_price || 0), 0);
        const profit = revenue - cost;

        setStats({
          products: productsRes.count || 0,
          sales: sales.length,
          entries: entries.length,
          revenue,
          profit,
        });

        const recent: Activity[] = movementsRes.data
          ?.slice(-10)
          .reverse()
          .map((m: any) => ({
            id: m.id,
            message: `${m.type === "IN" ? "Entrée" : "Sortie"} ${m.quantity} unités`,
            date: new Date(m.created_at).toLocaleString(),
          })) || [];
        setActivities(recent);

        const topMap: Record<string, TopProduct> = {};
        sales.forEach((s: any) => {
          if (!topMap[s.product_id])
            topMap[s.product_id] = { id: s.product_id, name: s.product_id, sold: 0, revenue: 0 };
          topMap[s.product_id].sold += 1;
          topMap[s.product_id].revenue += s.price || 0;
        });
        setTopProducts(Object.values(topMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

        const dateMap: Record<string, number> = {};
        sales.forEach((s: any) => {
          const dateKey = new Date(s.created_at).toLocaleDateString();
          dateMap[dateKey] = (dateMap[dateKey] || 0) + (s.price || 0);
        });
        setChartData(Object.entries(dateMap).map(([date, value]) => ({ date, revenue: value })));

        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
        toast.error("Erreur lors du chargement du dashboard");
      }
    };
    init();
  }, [navigate]);

  if (loading) {
    return (
      <div className={dark ? "dark" : ""}>
        <div className="flex items-center justify-center h-screen text-gray-500 dark:text-gray-300">
          Chargement du dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className={dark ? "dark" : ""}>
      <Toaster position="top-right" />
      <div className="min-h-screen p-4 md:p-6 bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">📊 Dashboard</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">Organisation: {orgId}</span>
        </div>

        {/* STATS CARDS */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 mb-6">
          <Card title="Produits" value={stats.products} />
          <Card title="Ventes" value={stats.sales} />
          <Card title="Entrées" value={stats.entries} />
          <Card title="Revenus ($)" value={stats.revenue} />
          <Card title="Profit ($)" value={stats.profit} highlight />
        </div>

        {/* GRAPHIQUE + ACTIVITÉ */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 lg:col-span-2">
            <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Revenus par jour</h2>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
                Aucun graphique disponible
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={dark ? "#444" : "#e0e0e0"} />
                  <XAxis dataKey="date" stroke={dark ? "#ccc" : "#666"} />
                  <YAxis stroke={dark ? "#ccc" : "#666"} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
            <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">Activité récente</h2>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {activities.map((act) => (
                <li key={act.id}>
                  {act.message} - <span className="text-gray-400">{act.date}</span>
                </li>
              ))}
              {activities.length === 0 && <li>Aucune activité récente</li>}
            </ul>

            <h2 className="font-semibold mt-6 mb-2 text-gray-900 dark:text-white">Top produits</h2>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {topProducts.map((p) => (
                <li key={p.id}>
                  {p.name} - Vendus: {p.sold}, Revenus: ${p.revenue}
                </li>
              ))}
              {topProducts.length === 0 && <li>Aucun produit vendu</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// 🔹 CARD COMPONENT
function Card({ title, value, highlight = false }: { title: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex flex-col ${
        highlight ? "border-l-4 border-emerald-500" : ""
      }`}
    >
      <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h2>
    </div>
  );
}