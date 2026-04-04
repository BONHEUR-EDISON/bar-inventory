import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
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

  // FETCH PRODUCTS & STOCK
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

  // MODAL HANDLERS
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
    const ok = window.confirm("Voulez-vous vraiment supprimer ce produit ?");
    if (!ok) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error("Suppression impossible");

    toast.success("Produit supprimé");
    fetchProducts();
  };

  // SUBMIT
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

        {/* GRID PRODUITS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
              Aucun produit
            </div>
          ) : (
            products.map((p) => (
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
                  <button onClick={() => handleDelete(p.id)} className="px-3 py-1 rounded-lg bg-rose-500 text-white text-sm hover:bg-rose-400 transition">Supprimer</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {editingProduct ? "Modifier le produit" : "Ajouter un nouveau produit"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nom du produit (ex: Pain de mie)"
                  className="w-full rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                    placeholder="Prix achat (ex: 500)"
                    className="rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: Number(e.target.value) })}
                    placeholder="Prix vente (ex: 700)"
                    className="rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                    placeholder="Stock minimum (ex: 5)"
                    className="rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                  {!editingProduct && (
                    <input
                      type="number"
                      value={formData.initial_stock}
                      onChange={(e) => setFormData({ ...formData, initial_stock: Number(e.target.value) })}
                      placeholder="Stock initial (ex: 50)"
                      className="rounded-xl border px-4 py-3 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />
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
      </div>
    </div>
  );
}