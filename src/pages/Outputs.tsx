import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabaseClient";
import { useOrganization } from "../hooks/useOrganization";
import toast, { Toaster } from "react-hot-toast";
import { X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
  created_at: string;
}

export default function Outputs() {
  const { organizationId } = useOrganization();

  const [products, setProducts] = useState<Product[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [stocks, setStocks] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);

  const [search, setSearch] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    product_id: "",
    remaining_stock: 0,
    unit_price: 0,
    date: new Date().toISOString().slice(0, 16),
  });

  // ================= FETCH =================
  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id,name,sale_price")
      .eq("organization_id", organizationId);

    if (data) {
      setProducts(data);
      setFilteredProducts(data);
    }
  };

  const fetchStocks = async () => {
    const { data } = await supabase
      .from("product_stock")
      .select("product_id,stock")
      .eq("organization_id", organizationId);

    if (data) {
      const map: Record<string, number> = {};
      data.forEach((s) => (map[s.product_id] = s.stock));
      setStocks(map);
    }
  };

  const fetchOutputs = async () => {
    const { data } = await supabase
      .from("stock_movements")
      .select("id,quantity,unit_price,created_at,products(name)")
      .eq("organization_id", organizationId)
      .eq("type", "OUT")
      .order("created_at", { ascending: false });

    if (data) {
      setOutputs(
        data.map((o: any) => ({
          id: o.id,
          product_name: o.products?.name,
          quantity: o.quantity,
          unit_price: o.unit_price,
          created_at: o.created_at,
        }))
      );
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchProducts();
      fetchStocks();
      fetchOutputs();
    }
  }, [organizationId]);

  // ================= SEARCH =================
  useEffect(() => {
    setFilteredProducts(
      products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [search, products]);

  const handleSelectProduct = (p: Product) => {
    setSelectedProduct(p);
    setFormData({
      ...formData,
      product_id: p.id,
      unit_price: p.sale_price, // 🔥 auto prix
    });
    setSearch(p.name);
  };

  // ================= SUBMIT =================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.product_id) return toast.error("Choisir un produit");

    try {
      const { error } = await supabase.rpc("create_output", {
        p_product: formData.product_id,
        p_org: organizationId,
        p_remaining: Number(formData.remaining_stock),
        p_price: Number(formData.unit_price),
        p_date: new Date(formData.date).toISOString(),
      });

      if (error) throw error;

      toast.success("Sortie enregistrée 🚀");

      setShowModal(false);
      setSearch("");
      setSelectedProduct(null);

      fetchOutputs();
      fetchStocks();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const currentStock = stocks[formData.product_id] || 0;
  const sortie = currentStock - Number(formData.remaining_stock || 0);

  // ================= UI =================
  return (
    <div className="p-4 md:p-6">
      <Toaster />

      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Sorties</h1>
        <button
          onClick={() => {
            setShowModal(true);
            setTimeout(() => searchRef.current?.focus(), 200);
          }}
          className="bg-red-600 text-white px-4 py-2 rounded-xl"
        >
          + Nouvelle sortie
        </button>
      </div>

      {/* TABLE */}
      <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl shadow">
        <table className="w-full">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="p-3">Produit</th>
              <th className="p-3">Quantité</th>
              <th className="p-3">Prix</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {outputs.map((o) => (
              <tr key={o.id} className="border-b text-center">
                <td className="p-3">{o.product_name}</td>
                <td className="p-3 text-red-600 font-bold">
                  -{o.quantity}
                </td>
                <td>{o.unit_price}</td>
                <td className="text-xs text-gray-500">
                  {new Date(o.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE */}
      <div className="md:hidden grid gap-4">
        {outputs.map((o) => (
          <div key={o.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
            <div className="flex justify-between">
              <span>{o.product_name}</span>
              <span className="text-red-600 font-bold">-{o.quantity}</span>
            </div>
            <div className="text-sm text-gray-500">{o.unit_price}</div>
          </div>
        ))}
      </div>

      {/* MODAL PREMIUM */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 shadow-2xl"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <div className="flex justify-between mb-4">
                <h2 className="font-bold text-lg">Nouvelle sortie</h2>
                <X onClick={() => setShowModal(false)} className="cursor-pointer" />
              </div>

              {/* SEARCH PRODUCT */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher produit..."
                  className="w-full pl-10 p-3 rounded-xl border dark:bg-gray-800"
                />

                {search && (
                  <div className="absolute w-full bg-white dark:bg-gray-800 mt-1 rounded-xl shadow max-h-40 overflow-auto z-10">
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
                )}
              </div>

              {/* STOCK */}
              <div className="text-sm mb-2">
                Stock: <b>{currentStock}</b>
              </div>

              <input
                type="number"
                placeholder="Stock restant"
                className="w-full mb-3 p-3 rounded-xl border dark:bg-gray-800"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    remaining_stock: Number(e.target.value),
                  })
                }
              />

              <div className="text-sm mb-3">
                Sortie: <b className="text-red-600">{sortie > 0 ? sortie : 0}</b>
              </div>

              <input
                type="number"
                value={formData.unit_price}
                className="w-full mb-3 p-3 rounded-xl border dark:bg-gray-800"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unit_price: Number(e.target.value),
                  })
                }
              />

              <input
                type="datetime-local"
                value={formData.date}
                className="w-full mb-4 p-3 rounded-xl border dark:bg-gray-800"
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
              />

              <button className="w-full bg-red-600 text-white py-3 rounded-xl">
                Enregistrer
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}