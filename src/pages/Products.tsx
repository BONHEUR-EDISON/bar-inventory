import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useOrganization } from "../hooks/useOrganization";
import { useDarkMode } from "../hooks/useDarkMode";

interface Product {
  id: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  min_stock: number;
}

interface ProductStock {
  product_id: string;
  stock: number;
}

// Modal de confirmation réutilisable
function ConfirmModal({
  isOpen,
  type,
  onCancel,
  onConfirm,
  itemName,
}: {
  isOpen: boolean;
  type: "delete" | "edit";
  onCancel: () => void;
  onConfirm: () => void;
  itemName?: string;
}) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="bg-white dark:bg-gray-900 w-[90%] max-w-sm rounded-2xl p-6 shadow-xl"
        >
          <h2 className="text-lg font-bold mb-3">
            {type === "delete" ? "Confirmer la suppression" : "Confirmer la modification"}
          </h2>

          <p className="text-sm text-gray-500 mb-5">
            {type === "delete"
              ? `Voulez-vous vraiment supprimer le produit "${itemName}" ? Cette action est irréversible.`
              : `Voulez-vous modifier le produit "${itemName}" ?`}
          </p>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
            >
              Annuler
            </button>

            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-white ${
                type === "delete" ? "bg-rose-600 hover:bg-rose-500" : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              Confirmer
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Products() {
  const { organizationId } = useOrganization();
  const { dark } = useDarkMode();

  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    purchase_price: 0,
    sale_price: 0,
    min_stock: 5,
    initial_stock: 0,
  });

  // Confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);

  // Fetch products & stock
  const fetchProducts = async () => {
    if (!organizationId) return;
    setLoading(true);

    const { data: productsData, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("organization_id", organizationId)
      .order("name");

    if (prodErr) {
      toast.error("Impossible de charger les produits");
      setLoading(false);
      return;
    }

    const { data: stockData, error: stockErr } = await supabase
      .from("product_stock")
      .select("*")
      .eq("organization_id", organizationId);

    if (stockErr) console.error(stockErr);

    const stockMap: Record<string, number> = {};
    stockData?.forEach((s: ProductStock) => (stockMap[s.product_id] = s.stock));

    setProducts(productsData || []);
    setStocks(stockMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [organizationId]);

  // Modal handlers
  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({ name: "", purchase_price: 0, sale_price: 0, min_stock: 5, initial_stock: 0 });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ ...product, initial_stock: 0 });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error("Suppression impossible");

    toast.success("Produit supprimé");
    fetchProducts();
  };

  const openConfirm = (item: Product) => {
    setSelectedItem(item);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (selectedItem) await handleDelete(selectedItem.id);
    setConfirmOpen(false);
    setSelectedItem(null);
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!organizationId) return toast.error("Organisation non chargée");
    if (!formData.name) return toast.error("Nom requis");

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update({
          name: formData.name,
          purchase_price: formData.purchase_price,
          sale_price: formData.sale_price,
          min_stock: formData.min_stock,
        })
        .eq("id", editingProduct.id);

      if (error) return toast.error("Erreur lors de la modification");
      toast.success("Produit modifié");
    } else {
      const { error } = await supabase
        .rpc("create_product_with_initial_stock", {
          p_org: organizationId,
          p_name: formData.name,
          p_purchase: formData.purchase_price,
          p_sale: formData.sale_price,
          p_initial_stock: formData.initial_stock,
        });

      if (error) return toast.error("Erreur lors de la création");
      toast.success("Produit créé");
    }

    setShowModal(false);
    fetchProducts();
  };

  if (loading) {
    return (
      <div className={dark ? "dark" : ""}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-300">
          Chargement...
        </div>
      </div>
    );
  }

  return (
    <div className={dark ? "dark" : ""}>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6 transition-colors">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3 md:mb-0">📦 Produits</h1>
          <button
            onClick={handleAdd}
            className="px-5 py-2 rounded-xl bg-emerald-600 text-white shadow hover:bg-emerald-500 transition"
          >
            + Ajouter un produit
          </button>
        </div>

        {/* TABLEAU Desktop */}
        <div className="hidden md:block overflow-x-auto rounded-2xl shadow border border-gray-100 dark:border-gray-700">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-2xl">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="text-left p-3">Nom</th>
                <th className="text-left p-3">Prix achat</th>
                <th className="text-left p-3">Prix vente</th>
                <th className="text-left p-3">Stock</th>
                <th className="text-left p-3">Stock min</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.purchase_price.toLocaleString()}</td>
                  <td className="p-3">{p.sale_price.toLocaleString()}</td>
                  <td className="p-3">{stocks[p.id] ?? 0}</td>
                  <td className="p-3">{p.min_stock}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => handleEdit(p)} className="px-2 py-1 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-400 transition">Modifier</button>
                    <button onClick={() => openConfirm(p)} className="px-2 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-400 transition">Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CARDS Mobile */}
        <div className="md:hidden grid grid-cols-1 gap-6">
          {products.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow hover:shadow-lg transition border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{p.name}</h2>
              <div className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                <div>Prix achat: <span className="font-medium">{p.purchase_price.toLocaleString()}</span></div>
                <div>Prix vente: <span className="font-medium">{p.sale_price.toLocaleString()}</span></div>
                <div>Stock: <span className="font-medium">{stocks[p.id] ?? 0}</span></div>
                <div>Stock min: <span className="font-medium">{p.min_stock}</span></div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => handleEdit(p)} className="px-3 py-1 rounded-lg bg-amber-500 text-white text-sm hover:bg-amber-400 transition">Modifier</button>
                <button onClick={() => openConfirm(p)} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-400 transition">Supprimer</button>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL AJOUT / MODIF EXPLICATIF */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {editingProduct ? "Modifier le produit" : "Ajouter un nouveau produit"}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {editingProduct
                  ? "Modifiez les informations du produit. Assurez-vous que tous les champs sont corrects avant d'enregistrer."
                  : "Entrez les informations du nouveau produit. Le stock initial sera ajouté automatiquement à l'inventaire."}
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du produit</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Pain de mie, Coca Cola"
                    className="w-full rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Le nom doit être unique pour votre organisation.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix achat</label>
                    <input
                      type="number"
                      value={formData.purchase_price}
                      onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                      placeholder="Ex: 500"
                      className="rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Le prix auquel vous achetez ce produit.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix vente</label>
                    <input
                      type="number"
                      value={formData.sale_price}
                      onChange={(e) => setFormData({ ...formData, sale_price: Number(e.target.value) })}
                      placeholder="Ex: 700"
                      className="rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Le prix auquel vous vendez ce produit.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock minimum</label>
                    <input
                      type="number"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                      placeholder="Ex: 5"
                      className="rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Le stock minimum avant d'être alerté.</p>
                  </div>

                  {!editingProduct && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock initial</label>
                      <input
                        type="number"
                        value={formData.initial_stock}
                        onChange={(e) => setFormData({ ...formData, initial_stock: Number(e.target.value) })}
                        placeholder="Ex: 50"
                        className="rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">Quantité initiale ajoutée à l'inventaire.</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 transition">
                    Annuler
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition">
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL CONFIRMATION */}
        <ConfirmModal
          isOpen={confirmOpen}
          type="delete"
          itemName={selectedItem?.name}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  );
}