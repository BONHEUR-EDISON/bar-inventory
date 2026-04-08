import { useState, useEffect, useMemo } from "react";
import { supabase } from "../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { X, DollarSign, Clock, Search } from "lucide-react";

interface ClientDebt {
  id: string;
  client_id: string;
  client_name: string;
  amount: number;
  paid_amount: number;
  status: "pending" | "partial" | "paid";
  created_at: string;
}

interface DebtHistory {
  id: string;
  amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<ClientDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentDebt, setCurrentDebt] = useState<ClientDebt | null>(null);
  const [history, setHistory] = useState<DebtHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "pending" | "partial" | "paid">("");

  // Fetch debts
  const fetchDebts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("debts")
      .select(`id, client_id, amount, paid_amount, status, created_at, clients(name)`)
      .order("created_at", { ascending: false });

    if (error) return toast.error(error.message);

    const mapped: ClientDebt[] = (data as any).map((d: any) => ({
      id: d.id,
      client_id: d.client_id,
      client_name: d.clients.name,
      amount: d.amount,
      paid_amount: d.paid_amount,
      status: d.status,
      created_at: d.created_at,
    }));

    setDebts(mapped);
    setLoading(false);
  };

  // Pay a debt
  const payDebt = async (debtId: string, amount: number) => {
    const debt = debts.find((d) => d.id === debtId);
    if (!debt) return toast.error("Dette introuvable");

    const remaining = debt.amount - debt.paid_amount;
    if (remaining <= 0) return toast("Le client est en règle !");

    if (amount > remaining) amount = remaining;

    setPayingDebtId(debtId);
    const { error } = await supabase.rpc("pay_debt", { p_debt_id: debtId, p_amount: amount });
    if (error) toast.error(error.message);
    else toast.success("Paiement effectué !");
    setPayingDebtId(null);
    fetchDebts();
    if (modalOpen && currentDebt) fetchDebtHistory(currentDebt.client_id);
  };

  // Fetch history
  const fetchDebtHistory = async (clientId: string) => {
    setHistoryLoading(true);
    setModalOpen(true);

    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) return toast.error(error.message);

    setHistory(data as DebtHistory[]);
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      const matchesSearch = d.client_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus ? d.status === filterStatus : true;
      return matchesSearch && matchesStatus;
    });
  }, [debts, searchQuery, filterStatus]);

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold mb-6">Gestion des dettes</h1>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex flex-1 items-center border rounded bg-white px-3">
          <Search size={20} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Rechercher par client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="border rounded px-3 py-2 bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="partial">Partiel</option>
          <option value="paid">Payé</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        {loading ? (
          <div className="text-center text-gray-500">Chargement...</div>
        ) : filteredDebts.length === 0 ? (
          <div className="text-center text-gray-500">Aucune dette trouvée</div>
        ) : (
          <table className="w-full bg-white rounded-lg shadow overflow-hidden">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3">Client</th>
                <th className="p-3">Total</th>
                <th className="p-3">Payé</th>
                <th className="p-3">Restant</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebts.map((debt) => {
                const remaining = debt.amount - debt.paid_amount;
                return (
                  <tr key={debt.id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-3">{debt.client_name}</td>
                    <td className="p-3">{debt.amount.toFixed(2)} $</td>
                    <td className="p-3">{debt.paid_amount.toFixed(2)} $</td>
                    <td className="p-3">{remaining.toFixed(2)} $</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          debt.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : debt.status === "partial"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {debt.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 flex gap-2">
                      <button
                        onClick={() => payDebt(debt.id, remaining)}
                        disabled={payingDebtId === debt.id || remaining <= 0}
                        className={`flex items-center gap-1 px-3 py-1 rounded transition ${
                          remaining <= 0
                            ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        <DollarSign size={16} /> Payer
                      </button>
                      <button
                        onClick={() => {
                          setCurrentDebt(debt);
                          fetchDebtHistory(debt.client_id);
                        }}
                        className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 transition flex items-center gap-1"
                      >
                        <Clock size={16} /> Détails
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="text-center text-gray-500">Chargement...</div>
        ) : filteredDebts.length === 0 ? (
          <div className="text-center text-gray-500">Aucune dette trouvée</div>
        ) : (
          filteredDebts.map((debt) => {
            const remaining = debt.amount - debt.paid_amount;
            return (
              <div
                key={debt.id}
                className="bg-white shadow-md rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center">
                  <h2 className="font-semibold">{debt.client_name}</h2>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      debt.status === "paid"
                        ? "bg-green-100 text-green-800"
                        : debt.status === "partial"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {debt.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-600 text-sm">
                  Total: {debt.amount.toFixed(2)} $ | Payé: {debt.paid_amount.toFixed(2)} $ | Restant:{" "}
                  {remaining.toFixed(2)} $
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => payDebt(debt.id, remaining)}
                    disabled={payingDebtId === debt.id || remaining <= 0}
                    className={`flex-1 flex justify-center items-center gap-1 px-3 py-1 rounded transition ${
                      remaining <= 0
                        ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    <DollarSign size={16} /> Payer
                  </button>
                  <button
                    onClick={() => {
                      setCurrentDebt(debt);
                      fetchDebtHistory(debt.client_id);
                    }}
                    className="flex-1 flex justify-center items-center gap-1 px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                  >
                    <Clock size={16} /> Détails
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {modalOpen && currentDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold mb-4">{currentDebt.client_name} - Détails</h2>
            <p className="mb-4">
              Total: {currentDebt.amount.toFixed(2)} $ | Payé: {currentDebt.paid_amount.toFixed(2)} $ | Restant:{" "}
              {(currentDebt.amount - currentDebt.paid_amount).toFixed(2)} $
            </p>
            <button
              onClick={() => payDebt(currentDebt.id, currentDebt.amount - currentDebt.paid_amount)}
              disabled={payingDebtId === currentDebt.id || currentDebt.amount - currentDebt.paid_amount <= 0}
              className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4 flex items-center gap-2 w-full ${
                currentDebt.amount - currentDebt.paid_amount <= 0 ? "bg-gray-300 cursor-not-allowed hover:bg-gray-300" : ""
              }`}
            >
              <DollarSign size={16} /> Payer le restant
            </button>

            <h3 className="text-lg font-semibold mb-2">Historique des paiements</h3>
            {historyLoading ? (
              <div className="text-gray-500">Chargement...</div>
            ) : history.length === 0 ? (
              <div className="text-gray-500">Aucun historique</div>
            ) : (
              <table className="w-full text-left border border-gray-200 rounded">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border-b">Date</th>
                    <th className="p-2 border-b">Montant</th>
                    <th className="p-2 border-b">Payé</th>
                    <th className="p-2 border-b">Restant</th>
                    <th className="p-2 border-b">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50 transition">
                      <td className="p-2 border-b">{new Date(h.created_at).toLocaleDateString()}</td>
                      <td className="p-2 border-b">{h.amount.toFixed(2)} $</td>
                      <td className="p-2 border-b">{h.paid_amount.toFixed(2)} $</td>
                      <td className="p-2 border-b">{(h.amount - h.paid_amount).toFixed(2)} $</td>
                      <td className="p-2 border-b">{h.status.toUpperCase()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}