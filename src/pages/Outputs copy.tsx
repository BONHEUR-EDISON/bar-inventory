import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { useDarkMode } from "../hooks/useDarkMode";

interface Product {
  id: string;
  name: string;
  sale_price: number;
}

interface Output {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  date: string;
}

export default function Outputs() {
  const { darkMode, toggleDarkMode } = useDarkMode();

  const [outputs, setOutputs] = useState<Output[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 0,
    unit_price: 0,
  });

  const [currentStock, setCurrentStock] = useState(0);
  const [futureStock, setFutureStock] = useState(0);

  // ================= INIT =================
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      const org = data?.organization_id;
      setOrgId(org);

      await fetchProducts(org);
      await fetchOutputs(org);
    };

    init();
  }, []);

  useEffect(() => {
    setFutureStock(currentStock - formData.quantity);
  }, [formData.quantity, currentStock]);

  // ================= DATA =================
  const fetchProducts = async (orgId: string) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("organization_id", orgId);

    setProducts(data || []);
  };

  const fetchOutputs = async (orgId: string) => {
    setLoading(true);

    const { data } = await supabase
      .from("stock_movements")
      .select("*, products(name)")
      .eq("organization_id", orgId)
      .eq("type", "OUT")
      .order("created_at", { ascending: false });

    setOutputs(
      data?.map((o: any) => ({
        id: o.id,
        product_name: o.products?.name,
        quantity: o.quantity,
        unit_price: o.unit_price,
        date: o.created_at,
      })) || []
    );

    setLoading(false);
  };

  // ================= STOCK RPC =================
  const getStock = async (productId: string) => {
    if (!orgId) return 0;

    const { data, error } = await supabase.rpc("get_current_stock", {
      p_product: productId,
      p_org: orgId,
    });

    if (error) {
      console.error("Erreur RPC get_current_stock:", error);
      return 0;
    }

    return data || 0;
  };

  // ================= ACTIONS =================
  const handleSelectProduct = async (p: Product) => {
    const stock = await getStock(p.id);
    setCurrentStock(stock);

    setFormData({
      ...formData,
      product_id: p.id,
      unit_price: p.sale_price,
    });

    setSearchText(p.name);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!orgId) return;

    if (formData.quantity > currentStock) {
      toast.error("Stock insuffisant !");
      return;
    }

    const { error } = await supabase.from("stock_movements").insert([
      {
        product_id: formData.product_id,
        organization_id: orgId,
        type: "OUT",
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        source: "vente",
      },
    ]);

    if (error) {
      toast.error("Erreur lors de l'enregistrement !");
    } else {
      toast.success("Sortie enregistrée 🚀");
      setShowModal(false);
      setFormData({ ...formData, quantity: 0 });
      setCurrentStock(await getStock(formData.product_id)); // MAJ du stock réel
      fetchOutputs(orgId);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading)
    return (
      <div className="text-center mt-10 text-gray-500 dark:text-gray-400">
        Chargement...
      </div>
    );

  return (
    <div className={darkMode ? "dark" : ""}>
      <Toaster position="top-right" />

      <div className="min-h-screen p-4 md:p-6 bg-gray-50 dark:bg-gray-900 transition">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold dark:text-white">
            📤 Sorties
          </h1>

          <div className="flex gap-2">
            <button
              onClick={toggleDarkMode}
              className="px-3 py-2 rounded-xl bg-gray-200 dark:bg-gray-700"
            >
              🌙
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl shadow"
            >
              + Ajouter
            </button>
          </div>
        </div>

        {/* ================= DESKTOP TABLE ================= */}
        <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700 text-left">
              <tr>
                <th className="p-3">Produit</th>
                <th className="p-3">Date</th>
                <th className="p-3">Quantité</th>
                <th className="p-3">Prix</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {outputs.map((o) => (
                <tr key={o.id} className="border-t dark:border-gray-700">
                  <td className="p-3 dark:text-white">{o.product_name}</td>
                  <td className="p-3 text-gray-500">
                    {new Date(o.date).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-red-500 font-bold">-{o.quantity}</td>
                  <td className="p-3">{o.unit_price}</td>
                  <td className="p-3 font-semibold">{o.quantity * o.unit_price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ================= MOBILE CARDS ================= */}
        <div className="md:hidden space-y-3">
          {outputs.map((o) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow"
            >
              <div className="font-semibold dark:text-white">{o.product_name}</div>

              <div className="text-sm text-gray-500">
                {new Date(o.date).toLocaleDateString()}
              </div>

              <div className="mt-2 flex justify-between">
                <span className="text-red-500 font-bold">-{o.quantity}</span>

                <span className="text-sm dark:text-gray-300">{o.unit_price} / u</span>
              </div>

              <div className="text-right font-semibold mt-2 dark:text-white">
                Total: {o.quantity * o.unit_price}
              </div>
            </motion.div>
          ))}
        </div>

        {/* ================= MODAL ================= */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <motion.form
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onSubmit={handleSubmit}
              className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-md space-y-4"
            >
              <h2 className="font-bold text-lg dark:text-white">Nouvelle sortie</h2>

              <input
                placeholder="Rechercher produit..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />

              <div className="max-h-32 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    {p.name}
                  </div>
                ))}
              </div>

              <input
                type="number"
                placeholder="Quantité"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: Number(e.target.value) })
                }
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white"
              />

              {/* STOCK */}
              {formData.product_id && (
                <div className="text-sm dark:text-gray-300">
                  <div>Stock actuel : {currentStock}</div>
                  <div className={futureStock < 0 ? "text-red-500" : "text-green-500"}>
                    Après : {futureStock}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded-lg"
                >
                  Annuler
                </button>

                <button disabled={futureStock < 0} className="bg-red-600 text-white px-4 py-2 rounded-lg">
                  Valider
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </div>
    </div>
  );
}