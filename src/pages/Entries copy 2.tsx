import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import { useOrganization } from "../hooks/useOrganization";
import { useDarkMode } from "../hooks/useDarkMode";

interface Product {
  id: string;
  name: string;
}

interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: "IN" | "OUT";
  quantity: number;
  unit_price: number;
  created_at: string;
}

export default function Entries() {
  const { organizationId } = useOrganization();
  const { darkMode, toggleDarkMode } = useDarkMode();

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    product_id: "",
    type: "IN",
    quantity: 0,
    unit_price: 0,
  });

  // =========================
  // FETCH PRODUCTS & MOVEMENTS
  // =========================
  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);

    const { data: productsData, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");

    if (prodErr) toast.error("Impossible de charger les produits");

    const { data: movementsData, error: movErr } = await supabase
      .from("stock_movements")
      .select("*, products(name)")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (movErr) toast.error("Impossible de charger les mouvements");

    setProducts(productsData || []);
    setMovements(
      (movementsData || []).map((m: any) => ({
        id: m.id,
        product_id: m.product_id,
        product_name: m.products.name,
        type: m.type,
        quantity: m.quantity,
        unit_price: m.unit_price,
        created_at: m.created_at,
      }))
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  // =========================
  // MODAL HANDLERS
  // =========================
  const handleAdd = () => {
    setFormData({ product_id: "", type: "IN", quantity: 0, unit_price: 0 });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!organizationId) return toast.error("Organisation non chargée");
    if (!formData.product_id) return toast.error("Produit requis");
    if (formData.quantity <= 0) return toast.error("Quantité invalide");

    const { error } = await supabase.from("stock_movements").insert([
      {
        product_id: formData.product_id,
        organization_id: organizationId,
        type: formData.type,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        source: "manual",
      },
    ]);

    if (error) return toast.error("Impossible d'ajouter le mouvement");

    toast.success(`Mouvement ${formData.type} ajouté`);
    setShowModal(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className={darkMode ? "dark" : ""}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-300">
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4 md:p-6 transition-colors">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">📈 Mouvements de stock</h1>
          <div className="flex gap-2 mt-3 md:mt-0">
            <button
              onClick={toggleDarkMode}
              className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-sm"
            >
              {darkMode ? "☀️ Clair" : "🌙 Sombre"}
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white shadow-sm"
            >
              + Ajouter mouvement
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-2xl shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left text-sm text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3 text-right">Prix unitaire</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    Aucun mouvement
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.product_name}</td>
                    <td className="px-4 py-3">{m.type}</td>
                    <td className="px-4 py-3 text-right">{m.quantity}</td>
                    <td className="px-4 py-3 text-right">{m.unit_price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{(m.unit_price * m.quantity).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{new Date(m.created_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Ajouter un mouvement</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white"
                >
                  <option value="">Sélectionner un produit</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as "IN" | "OUT" })}
                    className="rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="IN">Entrée (IN)</option>
                    <option value="OUT">Sortie (OUT)</option>
                  </select>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    placeholder="Quantité"
                    className="rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <input
                  type="number"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                  placeholder="Prix unitaire"
                  className="w-full rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white"
                />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Annuler</button>
                  <button type="submit" className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white">Enregistrer</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}