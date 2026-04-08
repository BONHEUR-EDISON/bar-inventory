"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Row {
  product_id: string;
  name: string;
  variant: string;
  sale_price: number;
  purchase_price: number;
  entries: number;
  outputs: number;
  stock_theoretical: number;
  stock_calculated: number;
  difference: number;
  revenue: number;
  margin: number;
  date: string;
}

interface AggregatedRow {
  date: string;
  productName: string;
  entriesByVariant: Record<string, number>;
  outputsByVariant: Record<string, number>;
  stock_theoretical: number;
  stock_calculated: number;
  difference: number;
  revenue: number;
  margin: number;
}

export default function InventoryPro() {
  const [rows, setRows] = useState<Row[]>([]);
  const [aggregatedRows, setAggregatedRows] = useState<AggregatedRow[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [orgId, setOrgId] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allVariants, setAllVariants] = useState<string[]>([]);

  // ================= INIT =================
  useEffect(() => {
    const init = async () => {
      const { data: org } = await supabase.from("user_organizations")
        .select("organization_id")
        .single();
      if (!org) return;
      setOrgId(org.organization_id);

      const { data: inv } = await supabase.from("inventories")
        .select("inventory_date")
        .eq("organization_id", org.organization_id)
        .order("inventory_date", { ascending: false })
        .limit(1)
        .single();

      if (inv) {
        const lastDate = inv.inventory_date.slice(0, 10);
        const nextDate = new Date(new Date(lastDate).getTime() + 86400000) // +1 jour
          .toISOString().slice(0, 10);
        setStartDate(nextDate);
        setLocked(true);
      } else {
        setStartDate(new Date().toISOString().slice(0, 10));
        setLocked(false);
      }
    };
    init();
  }, []);

  // ================= FETCH =================
  const fetchData = async () => {
    if (!orgId || !startDate || !endDate) return;
    setLoading(true);

    const { data, error } = await supabase.rpc("get_inventory_summary", {
      p_org: orgId,
      p_start: startDate,
      p_end: endDate,
    });

    if (error) {
      toast.error("Erreur chargement");
      setLoading(false);
      return;
    }
    const fetchedRows: Row[] = data || [];
    setRows(fetchedRows);

    // Agrégation par date + variant
    const map: Record<string, AggregatedRow> = {};
    const variantSet = new Set<string>();

    fetchedRows.forEach(r => {
      const key = r.date + "_" + r.name;
      if (!map[key]) {
        map[key] = {
          date: r.date,
          productName: r.name,
          entriesByVariant: {},
          outputsByVariant: {},
          stock_theoretical: r.stock_theoretical,
          stock_calculated: r.stock_calculated,
          difference: r.difference,
          revenue: r.revenue,
          margin: r.margin,
        };
      }
      const variantKey = r.variant || r.name;
      variantSet.add(variantKey);
      map[key].entriesByVariant[variantKey] =
        (map[key].entriesByVariant[variantKey] || 0) + r.entries;
      map[key].outputsByVariant[variantKey] =
        (map[key].outputsByVariant[variantKey] || 0) + r.outputs;
    });

    setAllVariants(Array.from(variantSet));
    setAggregatedRows(Object.values(map));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, orgId]);

  // ================= TOTALS =================
  const totalRevenue = useMemo(
    () => rows.reduce((sum, r) => sum + (r.revenue || 0), 0),
    [rows]
  );
  const totalMargin = useMemo(
    () => rows.reduce((sum, r) => sum + (r.margin || 0), 0),
    [rows]
  );

  // ================= SAVE =================
  const saveInventory = async () => {
    try {
      const user = await supabase.auth.getUser();
      const payload = rows.map((r) => ({
        product_id: r.product_id,
        real_stock: r.stock_calculated,
        unit_price: r.purchase_price,
      }));
      const { error } = await supabase.rpc("process_full_inventory", {
        p_org: orgId,
        p_inventory_date: endDate,
        p_created_by: user.data.user?.id,
        p_products: payload,
      });
      if (error) throw error;
      toast.success("Inventaire enregistré !");
      // Update startDate pour le prochain inventaire
      const nextDate = new Date(new Date(endDate).getTime() + 86400000)
        .toISOString().slice(0, 10);
      setStartDate(nextDate);
      setLocked(true);
    } catch {
      toast.error("Erreur !");
    }
  };

  // ================= EXPORT PDF =================
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Inventaire PRO", 14, 10);
    autoTable(doc, {
      startY: 20,
      head: [
        ["Date", "Produit", ...allVariants.map(v => `Entrée ${v}`), ...allVariants.map(v => `Sortie ${v}`), "Stock Théo", "Stock Calc", "Écart", "CA", "Marge"]
      ],
      body: aggregatedRows.map(r => [
        r.date,
        r.productName,
        ...allVariants.map(v => r.entriesByVariant[v] || 0),
        ...allVariants.map(v => r.outputsByVariant[v] || 0),
        r.stock_theoretical,
        r.stock_calculated,
        r.difference,
        r.revenue,
        r.margin
      ])
    });
    doc.save("inventaire.pdf");
  };

  // ================= EXPORT EXCEL =================
  const exportExcel = () => {
    const data = aggregatedRows.map(r => ({
      Date: r.date,
      Produit: r.productName,
      ...allVariants.reduce((acc, v) => ({ ...acc, [`Entrée ${v}`]: r.entriesByVariant[v] || 0 }), {}),
      ...allVariants.reduce((acc, v) => ({ ...acc, [`Sortie ${v}`]: r.outputsByVariant[v] || 0 }), {}),
      Stock_Theorique: r.stock_theoretical,
      Stock_Calcule: r.stock_calculated,
      Ecart: r.difference,
      CA: r.revenue,
      Marge: r.margin
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaire");
    XLSX.writeFile(wb, "inventaire.xlsx");
  };

  // ================= UI HELPERS =================
  const diffColor = (d: number) =>
    d === 0 ? "text-green-500" : d < 0 ? "text-red-500" : "text-yellow-500";

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <Toaster />

      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
        📦 Inventaire PRO
      </h1>

      {/* FILTER + ACTIONS */}
      <div className="flex flex-col md:flex-row gap-3 mb-6 items-center">
        <input
          type="date"
          value={startDate}
          disabled={locked}
          className="border rounded px-3 py-2 w-full md:w-auto"
        />
        <input
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-auto"
        />
        <div className="flex gap-2">
          <button
            onClick={saveInventory}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded shadow-md transition transform hover:scale-105"
          >
            Enregistrer
          </button>
          <button
            onClick={exportPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-md transition transform hover:scale-105"
          >
            PDF
          </button>
          <button
            onClick={exportExcel}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow-md transition transform hover:scale-105"
          >
            Excel
          </button>
        </div>
      </div>

      {loading && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-500 mb-4">
          Chargement...
        </motion.p>
      )}

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-4">
        <AnimatePresence>
          {aggregatedRows.map((r) => (
            <motion.div
              key={r.date + r.productName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="border rounded-xl p-4 shadow-lg bg-white"
            >
              <h2 className="font-semibold text-lg">{r.productName} - {r.date}</h2>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-700">
                {allVariants.map(v => (
                  <>
                    <span>Entrée {v}:</span><span>{r.entriesByVariant[v] || 0}</span>
                  </>
                ))}
                {allVariants.map(v => (
                  <>
                    <span>Sortie {v}:</span><span>{r.outputsByVariant[v] || 0}</span>
                  </>
                ))}
                <span>Stock:</span><span>{r.stock_calculated}</span>
                <span>Écart:</span><span className={diffColor(r.difference)}>{r.difference}</span>
                <span>CA:</span><span>{r.revenue}</span>
                <span>Marge:</span><span>{r.margin}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <motion.div
          className="border rounded-xl p-4 bg-gray-100 font-bold text-gray-800 shadow-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          TOTAL CA: {totalRevenue} <br />
          TOTAL MARGE: {totalMargin}
        </motion.div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-auto rounded-lg shadow-lg bg-white">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-gray-100 text-gray-800 font-semibold">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Produit</th>
              {allVariants.map(v => <th key={"ent_" + v} className="p-3">Entrée {v}</th>)}
              {allVariants.map(v => <th key={"out_" + v} className="p-3">Sortie {v}</th>)}
              <th className="p-3">Stock Théo</th>
              <th className="p-3">Stock Calc</th>
              <th className="p-3">Écart</th>
              <th className="p-3">CA</th>
              <th className="p-3">Marge</th>
            </tr>
          </thead>
          <tbody>
            {aggregatedRows.map(r => (
              <motion.tr
                key={r.date + r.productName}
                className="border-t hover:bg-gray-50"
                whileHover={{ scale: 1.01 }}
              >
                <td className="p-3">{r.date}</td>
                <td className="p-3">{r.productName}</td>
                {allVariants.map(v => <td key={"ent_val_" + v} className="p-3">{r.entriesByVariant[v] || 0}</td>)}
                {allVariants.map(v => <td key={"out_val_" + v} className="p-3">{r.outputsByVariant[v] || 0}</td>)}
                <td className="p-3">{r.stock_theoretical}</td>
                <td className="p-3">{r.stock_calculated}</td>
                <td className={`p-3 font-semibold ${diffColor(r.difference)}`}>{r.difference}</td>
                <td className="p-3">{r.revenue}</td>
                <td className="p-3">{r.margin}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}