import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

interface Client {
  id: string;
  name: string;
}

interface PosSale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

interface Debt {
  id: string;
  pos_sale_id?: string;
  amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
}

interface Props {
  client: Client;
  onClose: () => void;
}

export default function ClientTransactionsModal({ client, onClose }: Props) {
  const [posSales, setPosSales] = useState<PosSale[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [tab, setTab] = useState<"pos" | "debt">("pos");
  const [filter, setFilter] = useState<"all" | "cash" | "credit" | "mobile" | "bank">("all");

  // fetch POS Sales
  const fetchPosSales = async () => {
    const { data, error } = await supabase
      .from("pos_sales")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setPosSales(data);
  };

  // fetch Debts
  const fetchDebts = async () => {
    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setDebts(data);
  };

  useEffect(() => {
    fetchPosSales();
    fetchDebts();
  }, [client.id]);

  const filteredPos = posSales.filter(
    p => filter === "all" || p.payment_method === filter
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 space-y-4 overflow-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-2">Transactions: {client.name}</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-1 rounded ${tab==="pos"?"bg-blue-600 text-white":"bg-gray-200"}`}
            onClick={() => setTab("pos")}
          >
            Ventes POS
          </button>
          <button
            className={`px-4 py-1 rounded ${tab==="debt"?"bg-blue-600 text-white":"bg-gray-200"}`}
            onClick={() => setTab("debt")}
          >
            Dettes
          </button>
        </div>

        {/* POS Filters */}
        {tab === "pos" && (
          <div className="flex gap-2 mb-4">
            {["all","cash","credit","mobile","bank"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1 rounded ${filter===f?"bg-blue-600 text-white":"bg-gray-200"}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {/* Transactions Table */}
        <div className="overflow-auto max-h-[60vh]">
          {tab === "pos" ? (
            <table className="w-full text-left border">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 border">ID</th>
                  <th className="p-2 border">Montant</th>
                  <th className="p-2 border">Méthode</th>
                  <th className="p-2 border">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredPos.map(p => (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 border">{p.id.slice(0,6)}</td>
                    <td className="p-2 border">${p.total_amount.toFixed(2)}</td>
                    <td className="p-2 border">{p.payment_method}</td>
                    <td className="p-2 border">{new Date(p.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 border">ID Dette</th>
                  <th className="p-2 border">POS ID</th>
                  <th className="p-2 border">Montant</th>
                  <th className="p-2 border">Payé</th>
                  <th className="p-2 border">Statut</th>
                  <th className="p-2 border">Date</th>
                </tr>
              </thead>
              <tbody>
                {debts.map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 border">{d.id.slice(0,6)}</td>
                    <td className="p-2 border">{d.pos_sale_id?.slice(0,6)||"-"}</td>
                    <td className="p-2 border">${d.amount.toFixed(2)}</td>
                    <td className="p-2 border">${d.paid_amount.toFixed(2)}</td>
                    <td className="p-2 border">{d.status}</td>
                    <td className="p-2 border">{new Date(d.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end mt-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">Fermer</button>
        </div>
      </div>
    </div>
  );
}