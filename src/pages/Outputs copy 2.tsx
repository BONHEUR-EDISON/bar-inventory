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

interface Output {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number; // sortie réelle
  remaining_stock: number; // quantité restante saisie
  unit_price: number;
  date: string;
}

export default function Outputs() {
  const { organizationId } = useOrganization();
  const { darkMode, toggleDarkMode } = useDarkMode();

  const [products, setProducts] = useState<Product[]>([]);
  const [productStocks, setProductStocks] = useState<Record<string, number>>({});
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingOutput, setEditingOutput] = useState<Output | null>(null);
  const [searchText, setSearchText] = useState("");
  const [formData, setFormData] = useState({
    product_id: "",
    remaining_stock: 0,
    unit_price: 0,
    date: new Date().toISOString().slice(0, 10),
  });

  // =========================
  // FETCH DATA
  // =========================
  const fetchProducts = async (orgId: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, purchase_price, organization_id")
      .eq("organization_id", orgId)
      .order("name");
    if (error) return toast.error("Erreur lors du chargement des produits");
    setProducts(data || []);
  };

  const fetchProductStocks = async (orgId: string) => {
    const { data, error } = await supabase
      .from("product_stock")
      .select("product_id, stock")
      .eq("organization_id", orgId);

    if (error) return console.error(error);

    const stocks: Record<string, number> = {};
    data?.forEach((item: any) => (stocks[item.product_id] = item.stock || 0));
    setProductStocks(stocks);
  };

  const fetchOutputs = async (orgId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stock_movements")
      .select("id, product_id, quantity, remaining_stock, unit_price, created_at, products(name)")
      .eq("organization_id", orgId)
      .eq("type", "OUT")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      toast.error("Erreur lors du chargement des sorties");
      setLoading(false);
      return;
    }

    const formatted: Output[] =
      data?.map((row: any) => ({
        id: row.id,
        product_id: row.product_id,
        product_name: row.products?.name || "Produit inconnu",
        quantity: row.quantity,
        remaining_stock: row.remaining_stock,
        unit_price: row.unit_price,
        date: row.created_at,
      })) || [];

    setOutputs(formatted);
    setLoading(false);
  };

  useEffect(() => {
    if (!organizationId) return;
    fetchProducts(organizationId);
    fetchProductStocks(organizationId);
    fetchOutputs(organizationId);
  }, [organizationId]);

  // =========================
  // MODAL HANDLERS
  // =========================
  const handleAdd = () => {
    setEditingOutput(null);
    setFormData({
      product_id: "",
      remaining_stock: 0,
      unit_price: 0,
      date: new Date().toISOString().slice(0, 10),
    });
    setSearchText("");
    setShowModal(true);
  };

  const handleEdit = (output: Output) => {
    setEditingOutput(output);
    setFormData({
      product_id: output.product_id,
      remaining_stock: output.remaining_stock,
      unit_price: output.unit_price,
      date: output.date.slice(0, 10),
    });
    setSearchText(output.product_name);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const output = outputs.find((o) => o.id === id);
    if (!output) return;

    const ok = window.confirm("Voulez-vous vraiment supprimer cette sortie ?");
    if (!ok) return;

    // Restaurer le stock : stock actuel + sortie supprimée
    const oldStock = productStocks[output.product_id] || 0;
    const newStock = oldStock + output.quantity;
    await supabase
      .from("product_stock")
      .update({ stock: newStock })
      .eq("product_id", output.product_id)
      .eq("organization_id", organizationId);

    const { error } = await supabase.from("stock_movements").delete().eq("id", id);
    if (error) return toast.error("Suppression impossible");

    toast.success("Sortie supprimée");
    fetchOutputs(organizationId);
    fetchProductStocks(organizationId);
  };

  // =========================
  // PRODUCT SELECT
  // =========================
  const filteredProducts = useMemo(() => {
    const txt = searchText.toLowerCase().trim();
    if (!txt) return products;
    return products.filter((p) => p.name.toLowerCase().includes(txt));
  }, [products, searchText]);

  const handleSelectProduct = (product: Product) => {
    setFormData((prev) => ({
      ...prev,
      product_id: product.id,
      unit_price: product.purchase_price,
      remaining_stock: productStocks[product.id] || 0,
    }));
    setSearchText(product.name);
  };

  const currentStock = formData.product_id ? productStocks[formData.product_id] || 0 : 0;
  const sortie = Math.max(0, currentStock - formData.remaining_stock);

  // =========================
  // SUBMIT
  // =========================
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!organizationId) return toast.error("Organisation non chargée");
    if (!formData.product_id) return toast.error("Sélectionnez un produit");
    if (formData.remaining_stock > currentStock) return toast.error("Impossible: stock saisi supérieur au stock réel");

    const dateValue = `${formData.date}T12:00:00.000Z`;

    const payload = {
      product_id: formData.product_id,
      organization_id: organizationId,
      type: "OUT",
      quantity: sortie,
      remaining_stock: formData.remaining_stock,
      unit_price: formData.unit_price,
      source: "sortie",
      created_at: dateValue,
    };

    let error;

    if (editingOutput) {
      const oldQty = editingOutput.quantity;
      const stockChange = oldQty - sortie; // ajuster le stock
      const res = await supabase.from("stock_movements").update(payload).eq("id", editingOutput.id);
      error = res.error;

      if (!error) {
        const oldStock = productStocks[formData.product_id] || 0;
        const newStock = oldStock + stockChange;
        await supabase.from("product_stock").update({ stock: newStock }).eq("product_id", formData.product_id).eq("organization_id", organizationId);
      }
    } else {
      const res = await supabase.from("stock_movements").insert([payload]);
      error = res.error;

      if (!error) {
        const newStock = formData.remaining_stock;
        await supabase.from("product_stock").update({ stock: newStock }).eq("product_id", formData.product_id).eq("organization_id", organizationId);
      }
    }

    if (error) return toast.error("Erreur lors de l'enregistrement");
    toast.success(editingOutput ? "Sortie modifiée" : "Sortie enregistrée");
    setShowModal(false);
    fetchOutputs(organizationId);
    fetchProductStocks(organizationId);
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
        <div className="flex flex-col md:flex-row md:justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">📤 Sorties</h1>
          <div className="flex gap-2 mt-3 md:mt-0">
            <button onClick={toggleDarkMode} className="px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 shadow-sm">
              {darkMode ? "☀️ Clair" : "🌙 Sombre"}
            </button>
            <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-red-600 text-white shadow-sm">+ Nouvelle sortie</button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl shadow-sm bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left text-sm text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Sortie</th>
                <th className="px-4 py-3 text-right">Stock restant</th>
                <th className="px-4 py-3 text-right">Prix unitaire</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outputs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">Aucune sortie</td>
                </tr>
              ) : (
                outputs.map((output) => (
                  <tr key={output.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{output.product_name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{new Date(output.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-semibold">-{output.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{output.remaining_stock}</td>
                    <td className="px-4 py-3 text-right">{output.unit_price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      <button onClick={() => handleEdit(output)} className="px-3 py-1.5 rounded-lg bg-amber-500 text-white">Modifier</button>
                      <button onClick={() => handleDelete(output.id)} className="px-3 py-1.5 rounded-lg bg-rose-500 text-white">Supprimer</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{editingOutput ? "Modifier la sortie" : "Nouvelle sortie"}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Rechercher un produit..." className="w-full rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white"/>
                {searchText.trim() && filteredProducts.length > 0 && (
                  <div className="max-h-44 overflow-y-auto border rounded-xl mt-2">
                    {filteredProducts.map((p) => (
                      <button key={p.id} type="button" onClick={() => handleSelectProduct(p)} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                        {p.name} - Stock actuel: {productStocks[p.id] || 0}
                      </button>
                    ))}
                  </div>
                )}

                <input type="number" min={0} max={currentStock} value={formData.remaining_stock} onChange={(e) => setFormData({...formData, remaining_stock: Number(e.target.value)})} placeholder="Stock restant" className="w-full rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white"/>
                <input type="number" value={formData.unit_price} readOnly placeholder="Prix unitaire" className="w-full rounded-xl border px-4 py-3 dark:bg-gray-700 dark:text-white"/>
                <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white"/>

                {formData.product_id && (
                  <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900">
                    <div className="flex justify-between text-gray-700 dark:text-gray-300"><span>Stock actuel</span><span className="font-semibold">{currentStock}</span></div>
                    <div className="flex justify-between text-gray-700 dark:text-gray-300"><span>Sortie calculée</span><span className="font-semibold text-red-600 dark:text-red-400">{sortie}</span></div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Annuler</button>
                  <button type="submit" className="px-4 py-2.5 rounded-xl bg-red-600 text-white">Enregistrer</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}