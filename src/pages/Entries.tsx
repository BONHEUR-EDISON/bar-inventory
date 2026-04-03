import { useEffect, useState } from "react";
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
  created_at: string;
  stock_before: number;
  stock_after: number;
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
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 0,
    unit_price: 0,
    date: new Date().toISOString().slice(0, 10),
  });
  const [currentStock, setCurrentStock] = useState(0);

  // FETCH DATA
  const fetchProducts = async (orgId: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, purchase_price, organization_id")
      .eq("organization_id", orgId)
      .order("name");
    if (error) return toast.error("Erreur chargement produits");
    setProducts(data || []);
  };

  const fetchEntries = async (orgId: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_entries_with_stock", { p_org: orgId });
    if (error) {
      toast.error("Erreur chargement entrées");
      setLoading(false);
      return;
    }
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!organizationId) return;
    fetchProducts(organizationId);
    fetchEntries(organizationId);
  }, [organizationId]);

  // MODAL
  const handleAdd = () => {
    setEditingEntry(null);
    setFormData({ product_id: "", quantity: 0, unit_price: 0, date: new Date().toISOString().slice(0, 10) });
    setSearchText("");
    setCurrentStock(0);
    setShowModal(true);
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setFormData({ product_id: entry.product_id, quantity: entry.quantity, unit_price: entry.unit_price, date: entry.created_at.slice(0, 10) });
    setSearchText(entry.product_name);
    setCurrentStock(entry.stock_before);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm("Voulez-vous supprimer ?");
    if (!ok) return;
    const { error } = await supabase.from("stock_movements").delete().eq("id", id);
    if (error) return toast.error("Erreur suppression");
    toast.success("Entrée supprimée");
    fetchEntries(organizationId);
  };

  // PRODUCT SEARCH
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchText.toLowerCase().trim()));

  const handleSelectProduct = (product: Product) => {
    setFormData(prev => ({ ...prev, product_id: product.id, unit_price: product.purchase_price }));
    const entry = entries
      .filter(e => e.product_id === product.id)
      .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    setCurrentStock(entry ? entry.stock_after : 0);
    setSearchText(product.name);
  };

  const projectedStock = formData.product_id && formData.quantity ? currentStock + formData.quantity : currentStock;

  // SUBMIT
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!organizationId) return toast.error("Organisation non chargée");
    if (!formData.product_id) return toast.error("Sélectionnez un produit");
    if (formData.quantity <= 0) return toast.error("Quantité invalide");

    const payload = { product_id: formData.product_id, organization_id: organizationId, type: "IN", quantity: formData.quantity, unit_price: formData.unit_price, source: "purchase", created_at: `${formData.date}T12:00:00.000Z` };

    let error;
    if (editingEntry) {
      const res = await supabase.from("stock_movements").update(payload).eq("id", editingEntry.id);
      error = res.error;
    } else {
      const res = await supabase.from("stock_movements").insert([payload]);
      error = res.error;
    }

    if (error) return toast.error("Erreur enregistrement");
    toast.success(editingEntry ? "Entrée modifiée" : "Entrée ajoutée");
    setShowModal(false);
    fetchEntries(organizationId);
  };

  if (loading) return <div className={darkMode ? "dark" : ""}><div className="min-h-screen flex items-center justify-center">Chargement...</div></div>;

  return (
    <div className={darkMode ? "dark" : ""}>
      <Toaster position="top-right" />
      <div className="min-h-screen p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
        {/* HEADER */}
        <div className="flex justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📥 Entrées</h1>
          <div className="flex gap-2">
            <button onClick={toggleDarkMode} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700">{darkMode ? "☀️" : "🌙"}</button>
            <button onClick={handleAdd} className="px-3 py-1 rounded bg-emerald-600 text-white">+ Nouvelle entrée</button>
          </div>
        </div>

        {/* TABLEAU POUR DESKTOP */}
        <div className="overflow-x-auto rounded-xl shadow bg-white dark:bg-gray-800 hidden md:block">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-4 py-2">Produit</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Quantité</th>
                <th className="px-4 py-2">Prix</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2">Stock après</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="px-4 py-2">{entry.product_name}</td>
                  <td className="px-4 py-2">{new Date(entry.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">+{entry.quantity}</td>
                  <td className="px-4 py-2">{entry.unit_price}</td>
                  <td className="px-4 py-2">{entry.unit_price * entry.quantity}</td>
                  <td className="px-4 py-2">{entry.stock_after}</td>
                  <td className="px-4 py-2 flex gap-2">
                    <button onClick={() => handleEdit(entry)} className="px-2 py-1 bg-amber-500 text-white rounded">Edit</button>
                    <button onClick={() => handleDelete(entry.id)} className="px-2 py-1 bg-rose-500 text-white rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CARTES POUR MOBILE */}
        <div className="md:hidden space-y-4">
          {entries.map(entry => (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{entry.product_name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(entry)} className="px-2 py-1 bg-amber-500 text-white rounded text-sm">Edit</button>
                  <button onClick={() => handleDelete(entry.id)} className="px-2 py-1 bg-rose-500 text-white rounded text-sm">Delete</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-gray-700 dark:text-gray-300 text-sm">
                <div>Date: {new Date(entry.created_at).toLocaleDateString()}</div>
                <div>Quantité: +{entry.quantity}</div>
                <div>Prix: {entry.unit_price}</div>
                <div>Total: {entry.unit_price * entry.quantity}</div>
                <div>Stock après: {entry.stock_after}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-50">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-md">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Produit" className="border p-2 rounded" />
                {filteredProducts.map(p => (
                  <button key={p.id} type="button" className="text-left p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" onClick={() => handleSelectProduct(p)}>
                    {p.name}
                  </button>
                ))}
                <input type="number" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })} className="border p-2 rounded" placeholder="Quantité" />
                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="border p-2 rounded" />
                <div>Stock actuel: {currentStock} <br />Après entrée: {projectedStock}</div>
                <button type="submit" className="bg-blue-500 text-white p-2 rounded mt-2">Enregistrer</button>
              </form>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
}