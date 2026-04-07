import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../services/supabaseClient";
import { useOrganization } from "../hooks/useOrganization";
import { useDarkMode } from "../hooks/useDarkMode";
import { X, Search, Pencil, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  purchase_price?: number;
  organization_id?: string;
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

// Réutilisable pour suppression/modification
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
              ? `Voulez-vous vraiment supprimer "${itemName}" ? Cette action est irréversible.`
              : `Voulez-vous modifier "${itemName}" ?`}
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

export default function Entries() {
  const { organizationId } = useOrganization();
  const { dark = false } = useDarkMode();

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

  // Confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"delete" | "edit" | null>(null);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);

  const [currentStock, setCurrentStock] = useState(0);

  // FETCH PRODUCTS
  const fetchProducts = async (orgId: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, purchase_price, organization_id")
      .eq("organization_id", orgId)
      .order("name");
    if (error) return toast.error("Erreur chargement produits");
    setProducts(data || []);
  };

  // FETCH ENTRIES
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

  const handleAdd = () => {
    setEditingEntry(null);
    setFormData({ product_id: "", quantity: 0, unit_price: 0, date: new Date().toISOString().slice(0, 10) });
    setSearchText("");
    setCurrentStock(0);
    setShowModal(true);
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setFormData({
      product_id: entry.product_id,
      quantity: entry.quantity,
      unit_price: entry.unit_price,
      date: entry.created_at.slice(0, 10),
    });
    setSearchText(entry.product_name);
    setCurrentStock(entry.stock_before);
    setShowModal(true);
  };

  // HANDLE DELETE AVEC MODAL
  const handleDelete = (entry: Entry) => {
    setSelectedItem({ id: entry.id, name: entry.product_name } as Product);
    setConfirmType("delete");
    setConfirmOpen(true);
  };

  // CONFIRM MODAL FUNCTION
  const handleConfirm = async () => {
    if (!selectedItem || !organizationId || !confirmType) return;

    if (confirmType === "delete") {
      const { error } = await supabase
        .from("stock_movements")
        .delete()
        .eq("id", selectedItem.id);

      if (error) {
        toast.error("Erreur suppression");
      } else {
        toast.success(`Entrée "${selectedItem.name}" supprimée`);
        fetchEntries(organizationId);
      }
    } else if (confirmType === "edit") {
      toast.success(`Modification confirmée pour "${selectedItem.name}"`);
    }

    setConfirmOpen(false);
    setSelectedItem(null);
    setConfirmType(null);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchText.toLowerCase().trim())
  );

  const handleSelectProduct = async (product: Product) => {
  setFormData(prev => ({
    ...prev,
    product_id: product.id,
    unit_price: product.purchase_price || 0
  }));

  const { data, error } = await supabase
    .from("product_stock")
    .select("stock")
    .eq("product_id", product.id)
    .single();

  if (error) {
    toast.error("Erreur récupération stock");
    return;
  }

  setCurrentStock(data?.stock || 0);
  setSearchText(product.name);
};

  const projectedStock =
    formData.product_id && formData.quantity
      ? currentStock + formData.quantity
      : currentStock;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.product_id) return toast.error("Sélectionnez un produit");
    if (formData.quantity <= 0) return toast.error("Quantité invalide");

    const payload = {
      product_id: formData.product_id,
      organization_id: organizationId,
      type: "IN",
      quantity: formData.quantity,
      unit_price: formData.unit_price,
      source: "purchase",
      created_at: `${formData.date}T12:00:00.000Z`,
    };

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
    if (organizationId) fetchEntries(organizationId);
  };

  if (loading) {
    return (
      <div className={dark ? "dark" : ""}>
        <div className="min-h-screen flex items-center justify-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className={dark ? "dark" : ""}>
      <Toaster />

      <div className="min-h-screen w-full overflow-x-hidden p-3 sm:p-4 md:p-6 bg-gray-50 dark:bg-gray-900">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">Entrées</h1>
          <button
            onClick={handleAdd}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl w-full sm:w-auto"
          >
            + Nouvelle entrée
          </button>
        </div>

        {/* TABLE */}
        <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="min-w-[700px] w-full">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="p-3 text-left">Produit</th>
                  <th className="p-3 text-center">Date</th>
                  <th className="p-3 text-center">Quantité</th>
                  <th className="p-3 text-center">Prix</th>
                  <th className="p-3 text-center">Total</th>
                  <th className="p-3 text-center">Stock après</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <tr key={entry.id} className="border-b text-center">
                    <td className="p-3">{entry.product_name}</td>
                    <td className="p-3">{new Date(entry.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-green-600 font-bold">+{entry.quantity}</td>
                    <td className="p-3">{entry.unit_price}</td>
                    <td className="p-3">{entry.unit_price * entry.quantity}</td>
                    <td className="p-3">{entry.stock_after}</td>
                    <td className="flex justify-center gap-2 p-2">
                      <button onClick={() => handleEdit(entry)} className="p-2 bg-blue-500 text-white rounded-lg">
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry)}
                        className="p-2 bg-red-600 text-white rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE */}
        <div className="md:hidden grid gap-3">
          {entries.map(entry => (
            <div key={entry.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
              <div className="flex justify-between">
                <span>{entry.product_name}</span>
                <span className="text-green-600 font-bold">+{entry.quantity}</span>
              </div>
              <div className="text-sm text-gray-500">{entry.unit_price}</div>
            </div>
          ))}
        </div>

        {/* MODAL ENTRIES */}
        <AnimatePresence>
          {showModal && (
            <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-white dark:bg-gray-900 w-[95%] sm:w-full max-w-md rounded-2xl p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div className="flex justify-between mb-2">
                    <h2 className="font-bold text-lg">
                      {editingEntry ? "Modifier entrée" : "Nouvelle entrée"}
                    </h2>
                    <X onClick={() => setShowModal(false)} className="cursor-pointer" />
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      placeholder="Produit"
                      className="w-full pl-10 p-3 rounded-xl border dark:bg-gray-800"
                    />
                  </div>

                  {searchText && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow max-h-40 overflow-auto">
                      {filteredProducts.map(p => (
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

                  <div className="text-sm">Stock: {currentStock}</div>

                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl border dark:bg-gray-800"
                    placeholder="Quantité"
                  />

                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-3 rounded-xl border dark:bg-gray-800"
                  />

                  <div className="text-sm">
                    Après entrée: <b>{projectedStock}</b>
                  </div>

                  <button className="w-full bg-emerald-600 text-white py-3 rounded-xl">
                    Enregistrer
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODAL CONFIRMATION */}
        <ConfirmModal
          isOpen={confirmOpen}
          type={confirmType!}
          itemName={selectedItem?.name}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
        />
      </div>
    </div>
  );
}