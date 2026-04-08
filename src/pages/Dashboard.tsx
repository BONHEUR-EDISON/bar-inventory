// src/pages/Dashboard.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../services/supabaseClient";
import { useDarkMode } from "../hooks/useDarkMode";
import { motion, AnimatePresence } from "framer-motion";
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
  Legend,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip,
  Legend
);

// -------------------- TYPES --------------------
type DataItem = {
  name: string;
  revenue: number;
  margin: number;
  stock_theoretical: number;
  outputs: number;
  entries: number;
  difference: number;
};

type AlertItem = {
  msg: string;
  type: "danger" | "warning" | "info";
};

// -------------------- DASHBOARD --------------------
export default function Dashboard() {
  const { dark } = useDarkMode();

  const [data, setData] = useState<DataItem[]>([]);
  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    loss: 0,
    stock: 0,
    outputs: 0,
    products: 0,
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // -------------------- LOAD DATA --------------------
  const load = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data: orgData } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user?.user?.id)
        .single();

      const org = orgData?.organization_id;

      const { data: inventoryData, error } = await supabase.rpc("get_inventory_summary", {
        p_org: org,
        p_start: "2000-01-01",
        p_end: new Date().toISOString(),
      });

      if (error) throw error;

      const safeData: DataItem[] = inventoryData || [];
      setData(safeData);

      // ----- CALCUL STATS -----
      let revenue = 0,
        profit = 0,
        loss = 0,
        totalStock = 0,
        totalOutputs = 0;

      safeData.forEach((d) => {
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
        products: safeData.length,
      });

      // ----- ALERTS -----
      const newAlerts: AlertItem[] = [];
      safeData.forEach((d) => {
        if (d.margin < 0) newAlerts.push({ msg: `🔴 ${d.name} en perte`, type: "danger" });
        if (d.stock_theoretical < 5 && d.outputs > 5)
          newAlerts.push({ msg: `⚠️ ${d.name} rupture imminente`, type: "warning" });
        if (Math.abs(d.difference) > 5)
          newAlerts.push({ msg: `❗ ${d.name} anomalie stock`, type: "info" });
      });
      setAlerts(newAlerts.slice(0, 5));
    } catch (err) {
      toast.error("Erreur dashboard");
      console.error(err);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // -------------------- CHARTS --------------------
  const revenueChart = useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          label: "Revenu",
          data: data.map((d) => d.revenue),
          backgroundColor: dark ? "#34D399" : "#3B82F6",
          borderRadius: 6,
        },
      ],
    }),
    [data, dark]
  );

  const profitChart = useMemo(
    () => ({
      labels: ["Profit", "Perte"],
      datasets: [
        {
          data: [stats.profit || 0, stats.loss || 0],
          backgroundColor: [dark ? "#10B981" : "#22C55E", dark ? "#EF4444" : "#F87171"],
        },
      ],
    }),
    [stats, dark]
  );

  const activityChart = useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [
        {
          label: "Entrées",
          data: data.map((d) => d.entries),
          borderColor: "#3B82F6",
          backgroundColor: "#3B82F6",
          tension: 0.4,
        },
        {
          label: "Sorties",
          data: data.map((d) => d.outputs),
          borderColor: "#F59E0B",
          backgroundColor: "#F59E0B",
          tension: 0.4,
        },
      ],
    }),
    [data]
  );

  return (
    <div className={dark ? "dark" : ""}>
      <Toaster position="top-right" reverseOrder={false} />
      <main className="p-4 md:p-6 space-y-6 min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">

        {/* ----- KPI CARDS ----- */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card label="💰 Revenu" value={stats.revenue} green />
          <Card label="📈 Profit" value={stats.profit} green alert={stats.profit < 0} />
          <Card label="📉 Perte" value={stats.loss} red />
          <Card label="📦 Stock Total" value={stats.stock} />
          <Card label="📤 Sorties" value={stats.outputs} />
          <Card label="🧾 Produits" value={stats.products} />
        </div>

        {/* ----- ALERTS ----- */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow space-y-2">
          <h2 className="font-bold text-lg mb-2">🧠 Alertes intelligentes</h2>
          <AnimatePresence>
            {alerts.length === 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-gray-400"
              >
                Aucune alerte
              </motion.p>
            ) : (
              alerts.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className={`px-3 py-1 rounded-full text-sm font-medium inline-block ${
                    a.type === "danger"
                      ? "bg-red-100 dark:bg-red-700 text-red-700 dark:text-red-100"
                      : a.type === "warning"
                      ? "bg-yellow-100 dark:bg-yellow-700 text-yellow-700 dark:text-yellow-100"
                      : "bg-blue-100 dark:bg-blue-700 text-blue-700 dark:text-blue-100"
                  }`}
                >
                  {a.msg}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* ----- CHARTS ----- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard title="Revenue">
            <Bar data={revenueChart} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </ChartCard>

          <ChartCard title="Profit vs Perte">
            <Doughnut data={profitChart} options={{ responsive: true }} />
          </ChartCard>

          <ChartCard title="Activité">
            <Line data={activityChart} options={{ responsive: true, plugins: { legend: { position: "bottom" } } }} />
          </ChartCard>
        </div>
      </main>
    </div>
  );
}

// -------------------- CARD COMPONENT --------------------
type CardProps = {
  label: string;
  value: number;
  green?: boolean;
  red?: boolean;
  alert?: boolean;
};

function Card({ label, value, green, red, alert }: CardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hover:shadow-lg transition flex flex-col justify-between border-2 ${
        alert ? "border-red-400 dark:border-red-600" : "border-transparent"
      }`}
    >
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`text-xl font-bold ${
          green ? "text-green-500" : red ? "text-red-500" : "text-gray-700 dark:text-gray-200"
        }`}
      >
        {Math.round(value || 0)}
      </p>
    </motion.div>
  );
}

// -------------------- CHART CARD COMPONENT --------------------
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow hover:shadow-lg transition flex flex-col">
      <h3 className="mb-3 font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
      <div className="flex-1 h-[220px] md:h-[250px]">{children}</div>
    </div>
  );
}