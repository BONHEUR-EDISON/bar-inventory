import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../services/supabaseClient";
import { useOrganization } from "../hooks/useOrganization";
import { useDarkMode } from "../hooks/useDarkMode";

interface Product {
  id: string;
  name: string;
  purchase_price: number;
  organization_id: string;
}

interface Entry {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  date: string;
}

export default function Entries() {
  const { organizationId } = useOrganization();
  const { darkMode, toggleDarkMode } = useDarkMode();

  const [entries, setEntries] = useState<Entry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [searchText, setSearchText] = useState("");
  const [productStock, setProductStock] = useState(0);
  const [projectedStock, setProjectedStock] = useState(0);

  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 0,
    unit_price: 0,
    date: new Date().toISOString().slice(0, 10),
  });

  // =========================
  // DATA FETCH
  // =========================
  const fetchProducts = async (orgId: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, purchase_price, organization_id")
      .eq("organization_id", orgId)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      toast.error("Erreur lors du chargement des produits");
      return;
    }

    setProducts(data || []);
  };

  const fetchEntries = async (orgId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("stock_movements")
      .select("id, product_id, quantity, unit_price, created_at, products(name)")
      .eq("organization_id", orgId)
      .eq("type", "IN")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Erreur lors du chargement des entrées");
      setLoading(false);
      return;
    }

    const formatted: Entry[] =
      data?.map((row: any) => ({
        id: row.id,
        product_id: row.product_id,
        product_name: row.products?.name || "Produit inconnu",
        quantity: row.quantity,
        unit_price: row.unit_price,
        date: row.created_at,
      })) || [];

    setEntries(formatted);
    setLoading(false);
  };

  useEffect(() => {
    if (!organizationId) return;
    fetchProducts(organizationId);
    fetchEntries(organizationId);
  }, [organizationId]);

  // =========================
  // STOCK PREVIEW
  // =========================
  const getCurrentStock = async (productId: string) => {
    const { data, error } = await supabase.rpc("get_current_stock", {
      p_product: productId,
      p_org: organizationId,
    });

    if (error) {
      console.error(error);
      return 0;
    }

    return data || 0;
  };

  useEffect(() => {
    setProjectedStock(productStock + formData.quantity);
  }, [productStock, formData.quantity]);

  // =========================
  // MODAL HANDLERS
  // =========================
  const handleAdd = () => {
    setEditingEntry(null);
    setFormData({
      product_id: "",
      quantity: 0,
      unit_price: 0,
      date: new Date().toISOString().slice(0, 10),
    });
    setSearchText("");
    setProductStock(0);
    setProjectedStock(0);
    setShowModal(true);
  };

  // =========================
  // STOCK PREVIEW
  // =========================
  const handleSelectProduct = async (product: Product) => {
    // Récupère le stock réel via RPC
    const stock = await getCurrentStock(product.id);

    setFormData((prev) => ({
      ...prev,
      product_id: product.id,
      unit_price: product.purchase_price,
    }));

    setSearchText(product.name);

    // Stock actuel = réel
    setProductStock(stock);

    // Stock projeté = actuel + quantité saisie
    setProjectedStock(stock + formData.quantity);
  };

  // Met à jour automatiquement le stock projeté quand la quantité change
  useEffect(() => {
    setProjectedStock(productStock + formData.quantity);
  }, [formData.quantity, productStock]);

  // =========================
  // HANDLE EDIT
  // =========================
  const handleEdit = async (entry: Entry) => {
    setEditingEntry(entry);

    // Stock réel du produit
    const stock = await getCurrentStock(entry.product_id);

    setFormData({
      product_id: entry.product_id,
      quantity: entry.quantity,
      unit_price: entry.unit_price,
      date: entry.date.slice(0, 10),
    });

    setSearchText(entry.product_name);

    // Stock actuel = stock réel moins la quantité de cette entrée
    setProductStock(stock - entry.quantity);

    // Stock projeté = stock actuel + quantité
    setProjectedStock(stock);
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Voulez-vous vraiment supprimer cette entrée ?");
    if (!ok) return;

    const { error } = await supabase.from("stock_movements").delete().eq("id", id);

    if (error) {
      console.error(error);
      toast.error("Suppression impossible");
      return;
    }

    toast.success("Entrée supprimée");
    if (organizationId) fetchEntries(organizationId);
  };

  // =========================
  // PRODUCT SELECT
  // =========================
  const filteredProducts = useMemo(() => {
    const txt = searchText.toLowerCase().trim();
    if (!txt) return products;
    return products.filter((p) => p.name.toLowerCase().includes(txt));
  }, [products, searchText]);

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!organizationId) {
      toast.error("Organisation non chargée");
      return;
    }

    if (!formData.product_id) {
      toast.error("Veuillez sélectionner un produit");
      return;
    }

    if (formData.quantity <= 0) {
      toast.error("La quantité doit être supérieure à 0");
      return;
    }

    const dateValue = `${formData.date}T12:00:00.000Z`;

    const payload = {
      product_id: formData.product_id,
      organization_id: organizationId,
      type: "IN",
      quantity: formData.quantity,
      unit_price: formData.unit_price,
      source: "achat",
      created_at: dateValue,
    };

    let error;

    if (editingEntry) {
      const res = await supabase
        .from("stock_movements")
        .update(payload)
        .eq("id", editingEntry.id);
      error = res.error;
    } else {
      const res = await supabase.from("stock_movements").insert([payload]);
      error = res.error;
    }

    if (error) {
      console.error(error);
      toast.error("Erreur lors de l'enregistrement");
      return;
    }

    toast.success(editingEntry ? "Entrée modifiée" : "Entrée enregistrée");
    setShowModal(false);
    if (organizationId) fetchEntries(organizationId);
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
              📥 Entrées
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gestion des achats et des entrées en stock
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:shadow transition"
              type="button"
            >
              {darkMode ? "☀️ Clair" : "🌙 Sombre"}
            </button>

            <button
              onClick={handleAdd}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow transition"
              type="button"
            >
              + Nouvelle entrée
            </button>
          </div>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left text-sm text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 font-medium">Produit</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Quantité</th>
                <th className="px-4 py-3 font-medium text-right">Prix unitaire</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-gray-500 dark:text-gray-400"
                  >
                    Aucune entrée enregistrée
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition"
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                      {entry.product_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      +{entry.quantity}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                      {entry.unit_price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {(entry.quantity * entry.unit_price).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition"
                          type="button"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition"
                          type="button"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden space-y-3">
          {entries.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
              Aucune entrée enregistrée
            </div>
          ) : (
            entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {entry.product_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                      +{entry.quantity}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {entry.unit_price.toLocaleString()} / u
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Total
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {(entry.quantity * entry.unit_price).toLocaleString()}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="flex-1 px-3 py-2 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition"
                    type="button"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="flex-1 px-3 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition"
                    type="button"
                  >
                    Supprimer
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingEntry ? "Modifier l'entrée" : "Nouvelle entrée"}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Ajoute un mouvement IN dans le stock
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Produit
                  </label>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Rechercher un produit..."
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  {searchText.trim() && filteredProducts.length > 0 && (
                    <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleSelectProduct(product)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b last:border-b-0 border-gray-100 dark:border-gray-700"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Prix d'achat : {product.purchase_price.toLocaleString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quantité
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          quantity: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Prix unitaire
                    </label>
                    <input
                      type="number"
                      value={formData.unit_price}
                      readOnly
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {formData.product_id && (
                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 p-4 text-sm space-y-2">
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Stock actuel</span>
                      <span className="font-semibold">{productStock}</span>
                    </div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300">
                      <span>Stock après entrée</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {projectedStock}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  >
                    Annuler
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                  >
                    {editingEntry ? "Modifier" : "Enregistrer"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}