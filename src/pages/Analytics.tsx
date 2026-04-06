// src/pages/Analytics.tsx

import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

export default function Analytics() {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    loss: 0,
  });

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // =========================
  // ORG
  // =========================
  const getOrg = async () => {
    const { data } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .single();

    return data?.organization_id;
  };

  // =========================
  // LOAD
  // =========================
  const load = async () => {
    try {
      const org = await getOrg();

      const { data, error } = await supabase.rpc(
        "get_inventory_summary",
        {
          p_org: org,
          p_start: start || "2000-01-01",
          p_end: end || new Date().toISOString(),
        }
      );

      if (error) throw error;

      setData(data || []);

      let revenue = 0;
      let profit = 0;

      data.forEach((d: any) => {
        revenue += d.revenue;
        profit += d.margin;
      });

      setStats({
        revenue,
        profit,
        loss: profit < 0 ? Math.abs(profit) : 0,
      });

    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // =========================
  // HELPERS
  // =========================
  const topProducts = [...data]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const worstProducts = [...data]
    .sort((a, b) => a.margin - b.margin)
    .slice(0, 5);

  const anomalies = data.filter((d) => d.difference !== 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Toaster />

      {/* HEADER */}
      <h1 className="text-xl md:text-2xl font-bold">
        📊 Analytics avancé
      </h1>

      {/* FILTER */}
      <div className="flex gap-2">
        <input type="date" onChange={(e) => setStart(e.target.value)} className="border p-2 rounded" />
        <input type="date" onChange={(e) => setEnd(e.target.value)} className="border p-2 rounded" />
        <button onClick={load} className="bg-blue-500 text-white px-4 rounded">
          Filtrer
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card title="Revenu" value={stats.revenue} />
        <Card title="Profit" value={stats.profit} green />
        <Card title="Perte" value={stats.loss} red />
      </div>

      {/* ALERTES */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
        <h2 className="font-bold mb-3">⚠️ Alertes</h2>

        {anomalies.length === 0 ? (
          <p className="text-gray-400">Aucune anomalie</p>
        ) : (
          anomalies.slice(0, 5).map((a: any) => (
            <div key={a.product_id} className="text-sm flex justify-between">
              <span>{a.name}</span>
              <span className="text-red-500">{a.difference}</span>
            </div>
          ))
        )}
      </div>

      {/* TOP + WORST */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* TOP */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <h2 className="font-bold mb-3">🔥 Top produits</h2>
          {topProducts.map((p: any) => (
            <div key={p.product_id} className="flex justify-between text-sm">
              <span>{p.name}</span>
              <span className="text-green-500">{p.revenue}</span>
            </div>
          ))}
        </div>

        {/* WORST */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
          <h2 className="font-bold mb-3">📉 Produits à risque</h2>
          {worstProducts.map((p: any) => (
            <div key={p.product_id} className="flex justify-between text-sm">
              <span>{p.name}</span>
              <span className="text-red-500">{p.margin}</span>
            </div>
          ))}
        </div>

      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow overflow-auto">
        <h2 className="font-bold mb-4">Analyse complète</h2>

        <table className="min-w-[700px] w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th>Produit</th>
              <th>Entrées</th>
              <th>Sorties</th>
              <th>Stock</th>
              <th>Diff</th>
              <th>Revenu</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d: any) => (
              <tr key={d.product_id} className="border-b">
                <td>{d.name}</td>
                <td>{d.entries}</td>
                <td>{d.outputs}</td>
                <td>{d.stock_theoretical}</td>
                <td className={d.difference !== 0 ? "text-red-500" : ""}>
                  {d.difference}
                </td>
                <td>{d.revenue}</td>
                <td className={d.margin < 0 ? "text-red-500" : "text-green-500"}>
                  {d.margin}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =========================
// CARD
// =========================
function Card({ title, value, green, red }: any) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow"
    >
      <p className="text-xs text-gray-500">{title}</p>
      <p
        className={`text-xl font-bold ${
          green ? "text-green-500" : red ? "text-red-500" : ""
        }`}
      >
        {Math.round(value)}
      </p>
    </motion.div>
  );
}