import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useDarkMode } from "../hooks/useDarkMode";
import toast, { Toaster } from "react-hot-toast";
import { X } from "lucide-react";

interface Product {
  id: string;
  name: string;
  purchase_price: number;
  sale_price: number;
  current_stock: number;
  min_stock: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    initial_stock: 0,
    purchase_price: 0,
    sale_price: 0,
    min_stock: 5,
  });

  const { isDarkMode } = useDarkMode();

  const getOrganizationId = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", session.user.id)
      .single();

    return data?.organization_id || null;
  };

  const fetchProducts = async () => {
    setLoading(true);

    const org_id = await getOrganizationId();
    if (!org_id) return;

    const [productsRes, stockRes] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .eq("organization_id", org_id)
        .order("name"),

      supabase
        .from("product_stock")
        .select("*")
        .eq("organization_id", org_id),
    ]);

    if (productsRes.error || stockRes.error) {
      console.error("Erreur fetch produits");
      setLoading(false);
      return;
    }

    const merged: Product[] = (productsRes.data || []).map((p: any) => {
      const s = stockRes.data.find((x: any) => x.product_id === p.id);
      return { ...p, current_stock: s?.stock || 0 };
    });

    const filtered = search
      ? merged.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
      : merged;

    setProducts(filtered);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      initial_stock: 0,
      purchase_price: 0,
      sale_price: 0,
      min_stock: 5,
    });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      initial_stock: product.current_stock,
      purchase_price: product.purchase_price,
      sale_price: product.sale_price,
      min_stock: product.min_stock,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const org_id = await getOrganizationId();
    if (!org_id) return toast.error("Organisation introuvable");

    try {
      if (editingProduct) {
        await supabase
          .from("products")
          .update({
            name: formData.name,
            purchase_price: formData.purchase_price,
            sale_price: formData.sale_price,
            min_stock: formData.min_stock,
          })
          .eq("id", editingProduct.id);

        await supabase
          .from("product_stock")
          .update({ stock: formData.initial_stock })
          .eq("product_id", editingProduct.id);

        toast.success("Produit modifié !");
      } else {
        const { data: newProduct } = await supabase
          .from("products")
          .insert([
            {
              name: formData.name,
              purchase_price: formData.purchase_price,
              sale_price: formData.sale_price,
              min_stock: formData.min_stock,
              organization_id: org_id,
            },
          ])
          .select()
          .single();

        await supabase.from("product_stock").insert([
          {
            product_id: newProduct.id,
            organization_id: org_id,
            stock: formData.initial_stock,
          },
        ]);

        toast.success("Produit ajouté !");
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error("Erreur !");
    }
  };

  return (
    <div>
      <Toaster position="top-right" />

      <div className="flex justify-between mb-6">
        <h1 className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>Produits</h1>

        <div className="flex gap-2">
          <input
            placeholder="🔍 Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded-xl border focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow"
          >
            + Ajouter
          </button>
        </div>
      </div>

      {loading ? (
        <div>Chargement...</div>
      ) : (
        <div className="overflow-hidden rounded-2xl shadow">
          <table className="w-full bg-white dark:bg-gray-800">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="p-3 text-left">Produit</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Achat</th>
                <th className="p-3">Vente</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className={`p-3 ${p.current_stock <= p.min_stock ? "text-red-500 font-bold" : ""}`}>
                    {p.current_stock}
                  </td>
                  <td className="p-3">{p.purchase_price}</td>
                  <td className="p-3">{p.sale_price}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => handleEdit(p)}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl shadow-xl p-6 animate-scaleIn ${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingProduct ? "Modifier produit" : "Nouveau produit"}
              </h2>
              <button onClick={() => setShowModal(false)}>
                <X />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm">Nom du produit</label>
                <input
                  placeholder="Ex: Coca-Cola 50cl"
                  className={`w-full mt-1 p-3 rounded-xl border ${isDarkMode ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900"}`}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Stock initial</label>
                  <input
                    type="number"
                    placeholder="Ex: 100 unités"
                    className={`w-full mt-1 p-3 rounded-xl border ${isDarkMode ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900"}`}
                    value={formData.initial_stock}
                    onChange={(e) => setFormData({ ...formData, initial_stock: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-sm">Stock minimum</label>
                  <input
                    type="number"
                    placeholder="Seuil alerte"
                    className={`w-full mt-1 p-3 rounded-xl border ${isDarkMode ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900"}`}
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Prix d'achat</label>
                  <input
                    type="number"
                    placeholder="Ex: 500 FC"
                    className={`w-full mt-1 p-3 rounded-xl border ${isDarkMode ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900"}`}
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-sm">Prix de vente</label>
                  <input
                    type="number"
                    placeholder="Ex: 800 FC"
                    className={`w-full mt-1 p-3 rounded-xl border ${isDarkMode ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400" : "bg-white border-gray-300 text-gray-900"}`}
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: Number(e.target.value) })}
                  />
                </div>
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl shadow">
                💾 Enregistrer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
