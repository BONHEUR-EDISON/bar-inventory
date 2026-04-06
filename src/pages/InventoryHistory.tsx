// src/pages/HistoryInventaire.tsx

import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Inventory {
  id: string;
  inventory_date: string;
  total_value: number;
}

interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  theoretical_stock: number;
  real_stock: number;
  difference: number;
}

interface Timeline {
  id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  stock_before: number;
  stock_after: number;
}

export default function HistoryInventaire() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [timeline, setTimeline] = useState<Timeline[]>([]);

  const [selectedInventory, setSelectedInventory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

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
  // LOAD INVENTORIES
  // =========================
  const loadInventories = async () => {
    try {
      const org = await getOrg();

      const { data, error } = await supabase
        .from("inventories")
        .select("*")
        .eq("organization_id", org)
        .order("inventory_date", { ascending: false });

      if (error) throw error;

      setInventories(data || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // =========================
  // LOAD ITEMS
  // =========================
  const loadItems = async (inventoryId: string) => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("inventory_id", inventoryId);

      if (error) throw error;

      setItems(data || []);
      setSelectedInventory(inventoryId);
      setSelectedProduct(null);
      setTimeline([]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // =========================
  // LOAD TIMELINE
  // =========================
  const loadTimeline = async (productId: string) => {
    try {
      const org = await getOrg();

      const { data, error } = await supabase.rpc(
        "get_outputs_with_stock",
        { p_org: org }
      );

      if (error) throw error;

      const filtered = (data as Timeline[]).filter(
        (t) => t.product_id === productId
      );

      setTimeline(filtered);
      setSelectedProduct(productId);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  };

  useEffect(() => {
    loadInventories();
  }, []);

  // =========================
  // HELPERS
  // =========================
  const getStatus = (diff: number) => {
    if (diff > 0) return "text-green-500 font-semibold";
    if (diff < 0) return "text-red-500 font-semibold";
    return "text-gray-400";
  };

  // =========================
  // EXPORT PDF
  // =========================
  const exportPDF = () => {
    const doc = new jsPDF();

    doc.text("Inventaire", 14, 10);

    autoTable(doc, {
      head: [["Produit", "Théorique", "Réel", "Différence"]],
      body: items.map((i) => [
        i.product_name,
        i.theoretical_stock,
        i.real_stock,
        i.difference,
      ]),
    });

    doc.save("inventaire.pdf");
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Toaster />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-bold">
          📊 Historique Inventaire
        </h1>
      </div>

      {/* INVENTORY LIST */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventories.map((inv) => (
          <motion.div
            key={inv.id}
            whileHover={{ scale: 1.03 }}
            onClick={() => loadItems(inv.id)}
            className="cursor-pointer p-4 rounded-2xl bg-white dark:bg-gray-800 shadow hover:shadow-lg transition"
          >
            <p className="font-semibold text-sm md:text-base">
              📅 {new Date(inv.inventory_date).toLocaleDateString()}
            </p>
            <p className="text-xs md:text-sm text-gray-500">
              💰 {inv.total_value.toLocaleString()} CDF
            </p>
          </motion.div>
        ))}
      </div>

      {/* DETAILS */}
      {selectedInventory && (
        <div className="bg-white dark:bg-gray-900 p-4 md:p-6 rounded-2xl shadow space-y-4">

          {/* HEADER DETAIL */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <h2 className="font-bold text-lg">Résultat inventaire</h2>

            <button
              onClick={exportPDF}
              className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-lg text-sm"
            >
              Export PDF
            </button>
          </div>

          {/* TABLE RESPONSIVE */}
          <div className="overflow-x-auto">
            <table className="min-w-[500px] w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Produit</th>
                  <th>Système</th>
                  <th>Réel</th>
                  <th>Différence</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => loadTimeline(i.product_id)}
                    className="border-b cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    <td className="py-2">{i.product_name}</td>
                    <td>{i.theoretical_stock}</td>
                    <td>{i.real_stock}</td>
                    <td className={getStatus(i.difference)}>
                      {i.difference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TIMELINE */}
          {selectedProduct && (
            <div className="mt-4">
              <h3 className="font-semibold mb-3 text-sm md:text-base">
                📈 Historique des mouvements
              </h3>

              <div className="space-y-2">
                {timeline.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col md:flex-row md:justify-between gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800"
                  >
                    <span className="text-xs md:text-sm">
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>

                    <span
                      className={
                        t.quantity > 0
                          ? "text-green-500 font-semibold"
                          : "text-red-500 font-semibold"
                      }
                    >
                      {t.quantity > 0 ? "Entrée" : "Sortie"}
                    </span>

                    <span className="text-xs">
                      Avant: {t.stock_before}
                    </span>
                    <span className="text-xs">
                      Après: {t.stock_after}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}