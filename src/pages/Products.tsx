import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

interface Product {
  id: string;
  name: string;
  initial_stock: number;
  purchase_price: number;
  sale_price: number;
  created_at?: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    initial_stock: 0,
    purchase_price: 0,
    sale_price: 0,
  });
  const [search, setSearch] = useState("");

  // Récupérer l'organisation de l'utilisateur
  const getOrganizationId = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return null;

    const { data: profile } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", session.user.id)
      .single();

    return profile?.organization_id || null;
  };

  const fetchProducts = async () => {
    setLoading(true);
    const org_id = await getOrganizationId();
    if (!org_id) return;

    let query = supabase.from("products").select("*").eq("organization_id", org_id);
    
    if (search.trim() !== "") {
      query = query.ilike("name", `%${search}%`); // insensible à la casse
    }

    const { data, error } = await query.order("name", { ascending: true });

    if (error) console.error(error);
    else setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({ name: "", initial_stock: 0, purchase_price: 0, sale_price: 0 });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      initial_stock: product.initial_stock,
      purchase_price: product.purchase_price,
      sale_price: product.sale_price,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce produit ?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) console.error(error);
    else fetchProducts();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const org_id = await getOrganizationId();
    if (!org_id) return;

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update({ ...formData, organization_id: org_id })
        .eq("id", editingProduct.id);

      if (error) console.error(error);
    } else {
      const { error } = await supabase
        .from("products")
        .insert([{ ...formData, organization_id: org_id }]);
      if (error) console.error(error);
    }

    setShowModal(false);
    fetchProducts();
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          Produits
        </h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 md:flex-none border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Ajouter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-300">
          Chargement...
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="py-2 px-4 border-b text-left text-gray-900 dark:text-white">Nom</th>
                  <th className="py-2 px-4 border-b text-right text-gray-900 dark:text-white">Stock initial</th>
                  <th className="py-2 px-4 border-b text-right text-gray-900 dark:text-white">Prix achat</th>
                  <th className="py-2 px-4 border-b text-right text-gray-900 dark:text-white">Prix vente</th>
                  <th className="py-2 px-4 border-b text-center text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b dark:border-gray-700">
                    <td className="py-2 px-4">{p.name}</td>
                    <td className="py-2 px-4 text-right">{p.initial_stock}</td>
                    <td className="py-2 px-4 text-right">CDF {p.purchase_price}</td>
                    <td className="py-2 px-4 text-right">CDF {p.sale_price}</td>
                    <td className="py-2 px-4 text-center space-x-2">
                      <button
                        onClick={() => handleEdit(p)}
                        className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden grid gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex flex-col justify-between transition hover:scale-105 hover:shadow-lg"
              >
                <div>
                  <h2 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                    {p.name}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-300 text-sm">
                    Stock initial: {p.initial_stock}
                  </p>
                  <p className="text-gray-500 dark:text-gray-300 text-sm">
                    Prix achat: CDF {p.purchase_price}
                  </p>
                  <p className="text-gray-500 dark:text-gray-300 text-sm">
                    Prix vente: CDF {p.sale_price}
                  </p>
                </div>
                <div className="mt-4 flex justify-between gap-2">
                  <button
                    onClick={() => handleEdit(p)}
                    className="flex-1 px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="flex-1 px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingProduct ? "Modifier le produit" : "Ajouter un produit"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {["name", "initial_stock", "purchase_price", "sale_price"].map((field) => (
                <div key={field}>
                  <label className="block mb-1 text-gray-700 dark:text-gray-300 capitalize">
                    {field.replace("_", " ")}
                  </label>
                  <input
                    type={field.includes("price") || field.includes("stock") ? "number" : "text"}
                    value={(formData as any)[field]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        [field]: field.includes("price") || field.includes("stock")
                          ? Number(e.target.value)
                          : e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    required
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingProduct ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}