/* eslint-disable @typescript-eslint/no-unused-vars */
// src/pages/Dashboard.tsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useDarkMode } from "../hooks/useDarkMode";
import { supabase } from "../services/supabaseClient";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from "chart.js";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

export default function Dashboard() {
  const { dark } = useDarkMode();
  const navigate = useNavigate();
  const debounceRef = useRef<any>(null);

  const [stats, setStats] = useState({ products: 0, entries: 0, outputs: 0, stock: 0 });
  const [lastProducts, setLastProducts] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any>({ labels: [], entries: [], outputs: [] });

  // ---------- SAFE REFRESH ----------
  const safeRefresh = () => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData();
    }, 400);
  };

  // ---------- FETCH ----------
  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { data: orgData } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", userData?.user?.id)
        .single();

      const orgId = orgData?.organization_id;
      if (!orgId) return toast.error("Organisation introuvable");

      // STATS
      const { count: products } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", orgId);

      const { data: entriesData } = await supabase.rpc("get_entries_with_stock", { p_org: orgId });
      const { data: outputsData } = await supabase.rpc("get_outputs_with_stock", { p_org: orgId });

      // 🔥 FIX JOIN PRODUIT
      const { data: stockData } = await supabase
        .from("product_stock")
        .select(`
          stock,
          product_id,
          products (
            id,
            name
          )
        `)
        .eq("organization_id", orgId);

      const totalStock =
        stockData?.reduce((acc: number, item: any) => acc + (item.stock || 0), 0) ?? 0;

      setStats({
        products: products ?? 0,
        entries: entriesData?.length ?? 0,
        outputs: outputsData?.length ?? 0,
        stock: totalStock,
      });

      // LAST PRODUCTS
      const { data: lastProdData } = await supabase
        .from("products")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5);

      setLastProducts(lastProdData || []);

      // LOW STOCK FIX
      const low = stockData?.filter((s: any) => s.stock <= 5) || [];

      setLowStock(
        low.map((s: any) => ({
          id: s.product_id,
          name: s.products?.name || "Produit inconnu",
          stock: s.stock,
        }))
      );

      // CHART
      const now = Date.now();
      const last7 = new Date(now - 7 * 86400000).toISOString();

      const entries7 = entriesData?.filter((e: any) => e.created_at >= last7) || [];
      const outputs7 = outputsData?.filter((e: any) => e.created_at >= last7) || [];

      const labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      });

      const group = (data: any[]) =>
        labels.map(l =>
          data.filter(d =>
            new Date(d.created_at).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
            }) === l
          ).length
        );

      setChartData({
        labels,
        entries: group(entries7),
        outputs: group(outputs7),
      });

    } catch (err) {
      toast.error("Erreur chargement");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------- REALTIME + NOTIFICATIONS ----------
  useEffect(() => {
    const channel = supabase
      .channel("realtime-dashboard")

      .on("postgres_changes", { event: "INSERT", schema: "public", table: "products" }, _payload => {
        toast.success("🆕 Nouveau produit ajouté");
        safeRefresh();
      })

      .on("postgres_changes", { event: "INSERT", schema: "public", table: "entries" }, _payload => {
        toast.success("📥 Nouvelle entrée enregistrée");
        safeRefresh();
      })

      .on("postgres_changes", { event: "INSERT", schema: "public", table: "outputs" }, _payload => {
        toast("📤 Nouvelle sortie effectuée");
        safeRefresh();
      })

      .on("postgres_changes", { event: "*", schema: "public", table: "product_stock" }, _payload => {
        toast("⚠️ Mise à jour du stock");
        safeRefresh();
      })

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---------- MEMO CHART ----------
  const memoChart = useMemo(() => {
    return {
      labels: chartData.labels,
      datasets: [
        {
          data: chartData.entries,
          borderColor: "#22c55e",
          tension: 0.4,
          pointRadius: 0,
        },
        {
          data: chartData.outputs,
          borderColor: "#f87171",
          tension: 0.4,
          pointRadius: 0,
        },
      ],
    };
  }, [chartData]);

  return (
    <div className={dark ? "dark" : ""}>
      <Toaster position="top-right" />

      <main className="p-6 space-y-6 bg-gray-100 dark:bg-gray-900 min-h-screen">

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Produits" value={stats.products} color="emerald" onClick={() => navigate("/products")} />
          <StatCard label="Entrées" value={stats.entries} color="blue" onClick={() => navigate("/entries")} />
          <StatCard label="Sorties" value={stats.outputs} color="rose" onClick={() => navigate("/outputs")} />
          <StatCard label="Stock" value={stats.stock} color="amber" onClick={() => navigate("/inventory")} />
        </div>

        {/* MAIN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* CHART */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm">
            <h2 className="text-sm font-semibold mb-3">Activité (7 jours)</h2>

            <div className="h-[120px]">
              <Line
                data={memoChart}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { display: false }, y: { display: false } },
                }}
              />
            </div>
          </div>

          {/* LOW STOCK */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm">
            <h2 className="text-sm font-semibold mb-4">Stock faible</h2>

            {lowStock.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun problème</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lowStock.map((p: any) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-rose-500 font-bold">{p.stock}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* PRODUCTS */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
            Derniers produits
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lastProducts.map(p => (
              <motion.div
                key={p.id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate("/products")}
                className="cursor-pointer bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm hover:shadow-md"
              >
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-sm text-gray-500">
                  {p.sale_price?.toLocaleString()}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

// ---------- STAT CARD ----------
function StatCard({ label, value, color, onClick }: any) {
  const gradients: any = {
    emerald: "from-emerald-500 to-emerald-400",
    blue: "from-blue-500 to-blue-400",
    rose: "from-rose-500 to-rose-400",
    amber: "from-amber-500 to-amber-400",
  };

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="cursor-pointer bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm hover:shadow-md"
    >
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradients[color]}`} />
      </div>

      <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </motion.div>
  );
}