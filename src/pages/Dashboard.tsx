// src/pages/Dashboard.tsx

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../services/supabaseClient";
import { useDarkMode } from "../hooks/useDarkMode";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip
);

export default function Dashboard() {
  const { dark } = useDarkMode();

  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [alerts, setAlerts] = useState<any[]>([]);

  // =========================
  // LOAD
  // =========================
  const load = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data: orgData } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user?.user?.id)
        .single();

      const org = orgData?.organization_id;

      const { data, error } = await supabase.rpc(
        "get_inventory_summary",
        {
          p_org: org,
          p_start: "2000-01-01",
          p_end: new Date().toISOString(),
        }
      );

      if (error) throw error;

      setData(data || []);

      // =========================
      // KPI CALCUL
      // =========================
      let revenue = 0;
      let profit = 0;
      let loss = 0;
      let totalStock = 0;
      let totalOutputs = 0;

      data.forEach((d: any) => {
        revenue += d.revenue;
        profit += d.margin;
        totalStock += d.stock_theoretical;
        totalOutputs += d.outputs;
      });

      if (profit < 0) loss = Math.abs(profit);

      setStats({
        revenue,
        profit,
        loss,
        stock: totalStock,
        outputs: totalOutputs,
        products: data.length,
      });

      // =========================
      // AI ALERTS
      // =========================
      const alerts: any[] = [];

      data.forEach((d: any) => {
        if (d.margin < 0) {
          alerts.push({ msg: `🔴 ${d.name} en perte` });
        }

        if (d.stock_theoretical < 5 && d.outputs > 5) {
          alerts.push({ msg: `⚠️ ${d.name} rupture imminente` });
        }

        if (Math.abs(d.difference) > 5) {
          alerts.push({ msg: `❗ ${d.name} anomalie stock` });
        }
      });

      setAlerts(alerts.slice(0, 5));

    } catch (err) {
      toast.error("Erreur dashboard");
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =========================
  // CHARTS
  // =========================
  const revenueChart = useMemo(() => ({
    labels: data.map(d => d.name),
    datasets: [{ data: data.map(d => d.revenue) }],
  }), [data]);

  const profitChart = useMemo(() => ({
    labels: ["Profit", "Perte"],
    datasets: [{ data: [stats.profit || 0, stats.loss || 0] }],
  }), [stats]);

  const activityChart = useMemo(() => ({
    labels: data.map(d => d.name),
    datasets: [
      { data: data.map(d => d.entries) },
      { data: data.map(d => d.outputs) },
    ],
  }), [data]);

  return (
    <div className={dark ? "dark" : ""}>
      <Toaster />

      <main className="p-4 md:p-6 space-y-6 bg-gray-100 dark:bg-gray-900 min-h-screen">

        {/* KPI ULTRA */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card label="💰 Revenu" value={stats.revenue} />
          <Card label="📈 Profit" value={stats.profit} green />
          <Card label="📉 Perte" value={stats.loss} red />
          <Card label="📦 Stock Total" value={stats.stock} />
          <Card label="📤 Sorties" value={stats.outputs} />
          <Card label="🧾 Produits" value={stats.products} />
        </div>

        {/* ALERTS */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <h2 className="font-bold mb-3">🧠 Alertes intelligentes</h2>

          {alerts.length === 0 ? (
            <p className="text-gray-400">Aucune alerte</p>
          ) : (
            alerts.map((a, i) => (
              <div key={i} className="text-sm mb-2">
                {a.msg}
              </div>
            ))
          )}
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <ChartCard title="Revenue">
            <Bar data={revenueChart} />
          </ChartCard>

          <ChartCard title="Profit vs Perte">
            <Doughnut data={profitChart} />
          </ChartCard>

          <ChartCard title="Activité">
            <Line data={activityChart} />
          </ChartCard>

        </div>

      </main>
    </div>
  );
}

// =========================
// CARD
// =========================
function Card({ label, value, green, red }: any) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hover:shadow-lg transition"
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold ${
        green ? "text-green-500" : red ? "text-red-500" : ""
      }`}>
        {Math.round(value || 0)}
      </p>
    </motion.div>
  );
}

// =========================
// CHART CARD
// =========================
function ChartCard({ title, children }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="h-[200px]">{children}</div>
    </div>
  );
}