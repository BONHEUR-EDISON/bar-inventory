"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import dayjs from "dayjs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

// ---------------- TYPES ----------------
type DataItem = {
  name: string;
  revenue: number;
  margin: number;
  stock_theoretical: number;
  outputs: number;
  entries: number;
  difference: number;
};

type DailyTrend = {
  date: string;
  revenue: number;
  debt: number;
};

type AlertItem = {
  msg: string;
  type: "danger" | "warning" | "info";
};

export default function Dashboard() {
  const [data, setData] = useState<DataItem[]>([]);
  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    perte: 0,
    stock: 0,
    outputs: 0,
    products: 0,
    clients: 0,
    debt: 0,
  });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [trends, setTrends] = useState<DailyTrend[]>([]);
  const [topClients, setTopClients] = useState<{ name: string; total: number }[]>([]);

  // ---------------- LOAD DATA ----------------
  useEffect(() => {
    const load = async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user?.user) return;

        const { data: orgData } = await supabase
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", user.user.id)
          .single();

        const org = orgData?.organization_id;
        if (!org) return;

        const { data: inventoryData, error } = await supabase.rpc(
          "get_inventory_summary",
          { p_org: org, p_start: "2000-01-01", p_end: new Date().toISOString() }
        );
        if (error) throw error;

        const safeData: DataItem[] = inventoryData || [];
        setData(safeData);

        let revenue = 0,
          profit = 0,
          perte = 0,
          stock = 0,
          outputs = 0;

        safeData.forEach((d) => {
          revenue += Number(d.revenue);
          profit += Number(d.margin);
          stock += Number(d.stock_theoretical);
          outputs += Number(d.outputs);
        });

        if (profit < 0) perte = Math.abs(profit);

        const { data: clientsData } = await supabase
          .from("clients")
          .select("id,name,total_debt")
          .eq("organization_id", org);

        const totalDebt =
          clientsData?.reduce((acc, c) => acc + Number(c.total_debt), 0) || 0;

        const { data: salesData } = await supabase
          .from("pos_sales")
          .select("client_id,total_amount,created_at")
          .eq("organization_id", org);

        const map: Record<string, number> = {};
        (salesData || []).forEach((s: any) => {
          if (!s.client_id) return;
          map[s.client_id] =
            (map[s.client_id] || 0) + Number(s.total_amount);
        });

        const nameMap: Record<string, string> = {};
        (clientsData || []).forEach((c: any) => {
          nameMap[c.id] = c.name;
        });

        const top = Object.entries(map)
          .map(([id, total]) => ({ name: nameMap[id] || "Client", total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        setTopClients(top);

        const { data: debtsData } = await supabase
          .from("debts")
          .select("amount,paid_amount,created_at");

        const past30 = Array.from({ length: 30 }, (_, i) =>
          dayjs().subtract(29 - i, "day").format("YYYY-MM-DD")
        );

        const trendData = past30.map((date) => {
          const daySales = (salesData || []).filter((s: any) =>
            dayjs(s.created_at).format("YYYY-MM-DD") === date
          );

          const dayDebts = (debtsData || []).filter((d: any) =>
            dayjs(d.created_at).format("YYYY-MM-DD") === date
          );

          return {
            date,
            revenue: daySales.reduce(
              (acc, s) => acc + Number(s.total_amount),
              0
            ),
            debt: dayDebts.reduce(
              (acc, d) =>
                acc + (Number(d.amount) - Number(d.paid_amount || 0)),
              0
            ),
          };
        });

        setTrends(trendData);

        const newAlerts: AlertItem[] = [];
        safeData.forEach((d) => {
          if (d.margin < 0)
            newAlerts.push({ msg: `🔴 ${d.name} en perte`, type: "danger" });
          if (d.stock_theoretical < 5 && d.outputs > 5)
            newAlerts.push({ msg: `⚠️ ${d.name} rupture imminente`, type: "warning" });
          if (Math.abs(d.difference) > 5)
            newAlerts.push({ msg: `❗ ${d.name} anomalie stock`, type: "info" });
        });

        setAlerts(newAlerts.slice(0, 5));

        setStats({
          revenue,
          profit,
          perte,
          stock,
          outputs,
          products: safeData.length,
          clients: clientsData?.length || 0,
          debt: totalDebt,
        });
      } catch (err) {
        console.error(err);
        toast.error("Erreur dashboard");
      }
    };

    load();
  }, []);

  // ---------------- CHARTS ----------------
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" as const },
      tooltip: { enabled: true },
    },
  };

  const revenueChart = useMemo(
    () => ({
      labels: data.map((d) => d.name),
      datasets: [{ data: data.map((d) => d.revenue), backgroundColor: "#3B82F6" }],
    }),
    [data]
  );

  const profitChart = useMemo(
    () => ({
      labels: ["Profit", "Perte"],
      datasets: [{ data: [stats.profit, stats.perte], backgroundColor: ["#22C55E", "#EF4444"] }],
    }),
    [stats]
  );

  const debtChart = useMemo(
    () => ({
      labels: ["Dettes", "Payé"],
      datasets: [{ data: [stats.debt, stats.revenue - stats.debt], backgroundColor: ["#F59E0B", "#3B82F6"] }],
    }),
    [stats]
  );

  const trendRevenueChart = useMemo(
    () => ({
      labels: trends.map((t) => dayjs(t.date).format("DD/MM")),
      datasets: [{ label: "Ventes", data: trends.map((t) => t.revenue), borderColor: "#3B82F6", tension: 0.3 }],
    }),
    [trends]
  );

  const trendDebtChart = useMemo(
    () => ({
      labels: trends.map((t) => dayjs(t.date).format("DD/MM")),
      datasets: [{ label: "Dettes", data: trends.map((t) => t.debt), borderColor: "#F59E0B", tension: 0.3 }],
    }),
    [trends]
  );

  const topClientsChart = useMemo(
    () => ({
      labels: topClients.map((c) => c.name),
      datasets: [{ data: topClients.map((c) => c.total), backgroundColor: "#3B82F6" }],
    }),
    [topClients]
  );

  return (
    <main className="p-4 md:p-6 space-y-6 bg-gray-100 min-h-screen">
      <Toaster />

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Object.entries(stats).map(([key, value]) => (
          <Card key={key} label={key} value={value} />
        ))}
      </div>

      {/* ALERTS */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h2 className="font-bold mb-2">Alertes</h2>
        {alerts.length > 0 ? alerts.map((a, i) => <div key={i}>{a.msg}</div>) : <div className="text-gray-500">Aucune alerte</div>}
      </div>

      {/* GRILLE DES CHARTS */}
      <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow h-96">
          <Bar data={revenueChart} options={chartOptions} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow h-96">
          <Doughnut data={profitChart} options={chartOptions} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow h-96">
          <Doughnut data={debtChart} options={chartOptions} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow h-96">
          <Bar data={topClientsChart} options={chartOptions} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow h-96">
          <Line data={trendRevenueChart} options={chartOptions} />
        </div>
        <div className="bg-white p-4 rounded-xl shadow h-96">
          <Line data={trendDebtChart} options={chartOptions} />
        </div>
      </div>
    </main>
  );
}

// ---------------- CARD ----------------
function Card({ label, value }: any) {
  return (
    <div className="bg-white p-4 rounded-xl shadow flex flex-col items-start justify-center">
      <p className="text-xs text-gray-500 capitalize">{label}</p>
      <p className="font-bold text-lg">{Math.round(value || 0)}</p>
    </div>
  );
}