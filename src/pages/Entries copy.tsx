import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../services/supabaseClient";
import { useOrganization } from "../hooks/useOrganization";
import { useDarkMode } from "../hooks/useDarkMode";
import { X, Search, Pencil, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

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

// Modal confirmation générique
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

  const [filterProduct, setFilterProduct] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 0,
    unit_price: 0,
    date: new Date().toISOString().slice(0, 10),
  });

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

  const handleDelete = (entry: Entry) => {
    setSelectedItem({ id: entry.id, name: entry.product_name } as Product);
    setConfirmType("delete");
    setConfirmOpen(true);
  };

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

  const handleSelectProduct = (product: Product) => {
    setFormData(prev => ({ ...prev, product_id: product.id, unit_price: product.purchase_price || 0 }));
    const entry = entries
      .filter(e => e.product_id === product.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    setCurrentStock(entry ? entry.stock_after : 0);
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

  // FILTERED ENTRIES
  const displayedEntries = entries.filter(e => {
    const matchesProduct = filterProduct ? e.product_id === filterProduct : true;
    const matchesDate = filterDate ? e.created_at.slice(0, 10) === filterDate : true;
    return matchesProduct && matchesDate;
  });

  // EXPORT PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const tableData = displayedEntries.map(e => [
      e.product_name,
      new Date(e.created_at).toLocaleDateString(),
      e.quantity,
      e.unit_price,
      e.quantity * e.unit_price,
      e.stock_after
    ]);
    (doc as any).autoTable({
      head: [["Produit", "Date", "Qté", "Prix", "Total", "Stock"]],
      body: tableData,
    });
    doc.save("entrées.pdf");
  };

  // EXPORT EXCEL/CSV
  const handleExportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      displayedEntries.map(e => ({
        Produit: e.product_name,
        Date: new Date(e.created_at).toLocaleDateString(),
        Quantité: e.quantity,
        Prix: e.unit_price,
        Total: e.quantity * e.unit_price,
        Stock: e.stock_after
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Entrées");
    XLSX.writeFile(workbook, "entrées.xlsx");
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

      <div className="min-h-screen p-4 md:p-6 bg-gray-100 dark:bg-gray-900 space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Entrées</h1>
            <p className="text-sm text-gray-500">Gestion des entrées de stock</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAdd}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl shadow"
            >
              + Nouvelle entrée
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportPDF}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl shadow"
            >
              Export PDF
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportExcel}
              className="bg-yellow-500 hover:bg-yellow-400 text-white px-4 py-2 rounded-xl shadow"
            >
              Export Excel
            </motion.button>
          </div>
        </div>

        {/* FILTRE PRODUIT & DATE */}
        <div className="flex flex-col md:flex-row gap-3 items-start">
          <input
            type="text"
            placeholder="Rechercher produit..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="p-3 rounded-xl border flex-1 dark:bg-gray-800"
          />

          <select
            value={filterProduct}
            onChange={e => setFilterProduct(e.target.value)}
            className="p-3 rounded-xl border dark:bg-gray-800"
          >
            <option value="">Tous les produits</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="p-3 rounded-xl border dark:bg-gray-800"
          />
        </div>

        {/* TABLEAU */}
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 text-sm">
              <tr className="text-gray-600 dark:text-gray-300">
                <th className="p-4 text-left">Produit</th>
                <th className="p-4 text-center">Date</th>
                <th className="p-4 text-center">Qté</th>
                <th className="p-4 text-center">Prix</th>
                <th className="p-4 text-center">Total</th>
                <th className="p-4 text-center">Stock</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedEntries.map(entry => (
                <motion.tr
                  key={entry.id}
                  whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                  className="border-t text-sm"
                >
                  <td className="p-4 font-medium">{entry.product_name}</td>
                  <td className="p-4 text-center text-gray-500">{new Date(entry.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-center text-emerald-600 font-bold">+{entry.quantity}</td>
                  <td className="p-4 text-center">{entry.unit_price.toLocaleString()}</td>
                  <td className="p-4 text-center font-semibold">{(entry.unit_price * entry.quantity).toLocaleString()}</td>
                  <td className="p-4 text-center font-bold text-blue-600">{entry.stock_after}</td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => handleEdit(entry)}
                        className="p-2 bg-blue-500 text-white rounded-lg"
                      >
                        <Pencil size={16} />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => handleDelete(entry)}
                        className="p-2 bg-rose-600 text-white rounded-lg"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MODAL AJOUT/EDIT */}
        <AnimatePresence>
          {showModal && (
            <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl p-6 shadow-2xl"
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex justify-between">
                    <h2 className="font-bold text-lg">{editingEntry ? "Modifier" : "Nouvelle entrée"}</h2>
                    <X onClick={() => setShowModal(false)} className="cursor-pointer" />
                  </div>

                  {/* SEARCH */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      value={searchText}
                      onChange={e => setSearchText(e.target.value)}
                      placeholder="Rechercher produit..."
                      className="w-full pl-10 p-3 rounded-xl border focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800"
                    />
                  </div>

                  {/* RESULT */}
                  {searchText && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow max-h-40 overflow-auto">
                      {filteredProducts.map(p => (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProduct(p)}
                          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* STOCK */}
                  <div className="text-sm text-gray-500">
                    Stock actuel: <b>{currentStock}</b>
                  </div>

                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl border dark:bg-gray-800"
                    placeholder="Quantité"
                  />

                  <input
                    type="number"
                    value={formData.unit_price}
                    onChange={e => setFormData({ ...formData, unit_price: Number(e.target.value) })}
                    className="w-full p-3 rounded-xl border dark:bg-gray-800"
                    placeholder="Prix unitaire"
                  />

                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full p-3 rounded-xl border dark:bg-gray-800"
                  />

                  <div className="text-right text-gray-700 dark:text-gray-300">
                    Stock projeté: <b>{projectedStock}</b>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl"
                  >
                    {editingEntry ? "Modifier" : "Ajouter"}
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CONFIRM MODAL */}
        <ConfirmModal
          isOpen={confirmOpen}
          type={confirmType as any}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          itemName={selectedItem?.name}
        />
      </div>
    </div>
  );
}