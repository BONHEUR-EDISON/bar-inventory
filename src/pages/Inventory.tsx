import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

interface Product {
  id: string;
  name: string;
  initial_stock: number;
  final_stock: number;
}

interface Entry {
  product_id: string;
  quantity: number;
  date: string;
}

interface Output {
  product_id: string;
  quantity: number;
  date: string;
}

interface InventoryRow {
  product_id: string;
  product_name: string;
  stock_initial: number;
  total_entries: number;
  total_outputs: number;
  stock_final: number;
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [searchText, setSearchText] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data: productsData } = await supabase.from<Product>("products").select("*");
    const { data: entriesData } = await supabase
      .from<Entry>("entries")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate);

    const { data: outputsData } = await supabase
      .from<Output>("outputs")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate);

    setProducts(productsData || []);
    setEntries(entriesData || []);
    setOutputs(outputsData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    const inv: InventoryRow[] = products.map((p) => {
      const stockInitial = p.final_stock ?? p.initial_stock ?? 0;
      const totalEntries = entries
        .filter((e) => e.product_id === p.id)
        .reduce((sum, e) => sum + e.quantity, 0);
      const totalOutputs = outputs
        .filter((o) => o.product_id === p.id)
        .reduce((sum, o) => sum + o.quantity, 0);
      const stockFinal = stockInitial + totalEntries - totalOutputs;
      return {
        product_id: p.id,
        product_name: p.name,
        stock_initial: stockInitial,
        total_entries: totalEntries,
        total_outputs: totalOutputs,
        stock_final: stockFinal,
      };
    });
    setInventory(inv);
  }, [products, entries, outputs]);

  const handleSaveInventory = async () => {
    for (let row of inventory) {
      const { error } = await supabase
        .from("products")
        .update({ final_stock: row.stock_final })
        .eq("id", row.product_id);
      if (error) console.error(error);
    }
    alert("Inventaire enregistré, les stocks finaux ont été mis à jour !");
    fetchData();
  };

  const filteredInventory = inventory.filter((inv) =>
    inv.product_name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          Inventaire
        </h1>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border px-3 py-2 rounded-lg"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border px-3 py-2 rounded-lg"
          />
          <button
            onClick={handleSaveInventory}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Enregistrer l’inventaire
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Rechercher un produit..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="w-full md:w-1/3 mb-4 px-3 py-2 border rounded-lg"
      />

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500 dark:text-gray-300">
          Chargement...
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="py-2 px-4 text-left">Produit</th>
                  <th className="py-2 px-4 text-right">Stock Initial</th>
                  <th className="py-2 px-4 text-right">Entrées</th>
                  <th className="py-2 px-4 text-right">Sorties</th>
                  <th className="py-2 px-4 text-right">Stock Final</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((inv) => (
                  <tr key={inv.product_id} className="border-b dark:border-gray-700">
                    <td className="py-2 px-4">{inv.product_name}</td>
                    <td className="py-2 px-4 text-right">{inv.stock_initial}</td>
                    <td className="py-2 px-4 text-right">{inv.total_entries}</td>
                    <td className="py-2 px-4 text-right">{inv.total_outputs}</td>
                    <td className="py-2 px-4 text-right">{inv.stock_final}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {filteredInventory.map((inv) => (
              <div key={inv.product_id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-1">
                <div className="font-bold">{inv.product_name}</div>
                <div>Stock Initial: {inv.stock_initial}</div>
                <div>Entrées: {inv.total_entries}</div>
                <div>Sorties: {inv.total_outputs}</div>
                <div className="font-semibold">Stock Final: {inv.stock_final}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}