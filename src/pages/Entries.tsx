//
import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useOrganization } from "../hooks/useOrganization";
import { db } from "../services/db";

interface Product {
  id: string;
  name: string;
  purchase_price: number;
  final_stock: number;
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
  const [entries, setEntries] = useState<Entry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 0,
    unit_price: 0,
    date: new Date().toISOString().slice(0, 10),
  });
  const [searchText, setSearchText] = useState("");

  // Fetch products
  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from<Product>("products")
      .select("*");
    if (error) console.error(error);
    else setProducts(data || []);
  };

  // Fetch entries
  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from<Entry>("entries")
      .select(`
        *,
        products!inner(name)
      `);
    if (error) console.error(error);
    else setEntries(
      data?.map(d => ({
        ...d,
        product_name: (d as any).products.name
      })) || []
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    fetchEntries();
  }, []);

  const handleAdd = () => {
    setEditingEntry(null);
    setFormData({ product_id: "", quantity: 0, unit_price: 0, date: new Date().toISOString().slice(0,10) });
    setSearchText("");
    setShowModal(true);
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setFormData({
      product_id: entry.product_id,
      quantity: entry.quantity,
      unit_price: entry.unit_price,
      date: entry.date,
    });
    setSearchText(entry.product_name);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette entrée ?")) return;
    const { error } = await supabase.from("entries").delete().eq("id", id);
    if (error) console.error(error);
    else fetchEntries();
  };

 const { organizationId } = useOrganization();

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (!organizationId) {
    return alert("Organisation non chargée");
  }

  if (!formData.product_id) {
    return alert("Veuillez sélectionner un produit");
  }

  const entryData = {
    product_id: formData.product_id,
    quantity: formData.quantity,
    unit_price: formData.unit_price,
    date: formData.date,
  };

  if (editingEntry) {
    const { error } = await db.update("entries", editingEntry.id, entryData);
    if (error) return console.error(error);
  } else {
    const { error } = await db.insert("entries", entryData, organizationId);
    if (error) return console.error(error);
  }

  setShowModal(false);
  fetchEntries();
};
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectProduct = (product: Product) => {
    setFormData({
      ...formData,
      product_id: product.id,
      unit_price: product.purchase_price
    });
    setSearchText(product.name);
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Entrées</h1>
        <button onClick={handleAdd} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
          Ajouter une entrée
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-300">Chargement...</div>
      ) : (
        <>
          {/* TABLEAU DESKTOP */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="py-2 px-4 text-left text-gray-900 dark:text-white">Produit</th>
                  <th className="py-2 px-4 text-right text-gray-900 dark:text-white">Quantité</th>
                  <th className="py-2 px-4 text-right text-gray-900 dark:text-white">Prix unitaire</th>
                  <th className="py-2 px-4 text-center text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b dark:border-gray-700">
                    <td className="py-2 px-4">{e.product_name}</td>
                    <td className="py-2 px-4 text-right">{e.quantity}</td>
                    <td className="py-2 px-4 text-right">{e.unit_price}</td>
                    <td className="py-2 px-4 text-center space-x-2">
                      <button onClick={() => handleEdit(e)} className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">Modifier</button>
                      <button onClick={() => handleDelete(e.id)} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CARTES MOBILE */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {entries.map(e => (
              <div key={e.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-1">
                <div className="font-bold">{e.product_name}</div>
                <div>Quantité: {e.quantity}</div>
                <div>Prix unitaire: {e.unit_price}</div>
                <div className="flex space-x-2 mt-2">
                  <button onClick={() => handleEdit(e)} className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">Modifier</button>
                  <button onClick={() => handleDelete(e.id)} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">Supprimer</button>
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
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">{editingEntry ? "Modifier l'entrée" : "Ajouter une entrée"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-gray-700 dark:text-gray-300">Produit</label>
                <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
                  className="w-full border px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Rechercher un produit..." required
                />
                {searchText && filteredProducts.length > 0 && (
                  <ul className="border border-gray-300 dark:border-gray-600 rounded-lg mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-700">
                    {filteredProducts.map(p => (
                      <li key={p.id} onClick={() => handleSelectProduct(p)} className="px-3 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer">
                        {p.name} (Stock: {p.final_stock || 0})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <label className="block mb-1 text-gray-700 dark:text-gray-300">Quantité</label>
                <input type="number" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                  className="w-full border px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block mb-1 text-gray-700 dark:text-gray-300">Prix unitaire</label>
                <input type="number" value={formData.unit_price} readOnly
                  className="w-full border px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block mb-1 text-gray-700 dark:text-gray-300">Date</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date:e.target.value})}
                  className="w-full border px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white" required />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">{editingEntry ? "Modifier" : "Ajouter"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}