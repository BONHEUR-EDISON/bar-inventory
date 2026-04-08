'use client';

import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { Pencil, Trash2, Eye } from "lucide-react";
import ClientFormModal from "../components/ClientFormModal";
import ClientTransactionsModal from "../components/ClientTransactionsModal";
import toast, { Toaster } from "react-hot-toast";

interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  total_debt: number;
  credit_limit: number;
  created_at: string;
  organization_id: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const getOrgId = () => {
    const orgId = localStorage.getItem("organization_id");
    if (!orgId) {
      toast.error("Organisation introuvable");
      return null;
    }
    return orgId;
  };

  const fetchClients = async () => {
    const orgId = getOrgId();
    if (!orgId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("organization_id", orgId) // ✅ filtre clé
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(error.message);
    } else {
      setClients(data || []);
    }

    setLoading(false);
  };

  const deleteClient = async (id: string) => {
    const orgId = getOrgId();
    if (!orgId) return;

    if (!confirm("Voulez-vous vraiment supprimer ce client ?")) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId); // ✅ sécurité multi-tenant

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Client supprimé !");
      fetchClients();
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <Toaster position="top-right" />

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button
          onClick={() =>
            setEditClient({
              id: "",
              name: "",
              total_debt: 0,
              credit_limit: 0,
              created_at: "",
              organization_id: getOrgId() || "",
            })
          }
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Ajouter Client
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="text-center py-10 text-gray-500">
          Chargement des clients...
        </div>
      )}

      {/* DESKTOP TABLE */}
      {!loading && (
        <div className="hidden md:block bg-white rounded-xl shadow-md overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Nom</th>
                <th className="p-3">Téléphone</th>
                <th className="p-3">Email</th>
                <th className="p-3">Dette</th>
                <th className="p-3">Crédit</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center p-6 text-gray-500">
                    Aucun client trouvé
                  </td>
                </tr>
              )}

              {clients.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3">{c.phone || "-"}</td>
                  <td className="p-3">{c.email || "-"}</td>
                  <td className="p-3 text-red-600 font-semibold">
                    ${c.total_debt.toFixed(2)}
                  </td>
                  <td className="p-3 text-green-600 font-semibold">
                    ${c.credit_limit.toFixed(2)}
                  </td>
                  <td className="p-3 flex gap-3">
                    <button
                      onClick={() => setDetailClient(c)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Eye size={18} />
                    </button>

                    <button
                      onClick={() => setEditClient(c)}
                      className="text-yellow-500 hover:text-yellow-700"
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      onClick={() => deleteClient(c.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MOBILE */}
      {!loading && (
        <div className="md:hidden space-y-4">
          {clients.length === 0 && (
            <p className="text-center text-gray-500">Aucun client</p>
          )}

          {clients.map((c) => (
            <div
              key={c.id}
              className="bg-white p-4 rounded-xl shadow-md space-y-2"
            >
              <h2 className="text-lg font-semibold">{c.name}</h2>
              <p className="text-gray-500">{c.phone || "-"}</p>
              <p className="text-gray-500">{c.email || "-"}</p>

              <div className="flex justify-between">
                <span className="text-red-600 font-semibold">
                  ${c.total_debt.toFixed(2)}
                </span>
                <span className="text-green-600 font-semibold">
                  ${c.credit_limit.toFixed(2)}
                </span>
              </div>

              <div className="flex gap-4 mt-2">
                <button
                  onClick={() => setDetailClient(c)}
                  className="text-blue-600"
                >
                  <Eye size={16} />
                </button>

                <button
                  onClick={() => setEditClient(c)}
                  className="text-yellow-500"
                >
                  <Pencil size={16} />
                </button>

                <button
                  onClick={() => deleteClient(c.id)}
                  className="text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALS */}
      {editClient && (
        <ClientFormModal
          client={editClient}
          onClose={() => {
            setEditClient(null);
            fetchClients();
          }}
        />
      )}

      {detailClient && (
        <ClientTransactionsModal
          client={detailClient}
          onClose={() => setDetailClient(null)}
        />
      )}
    </div>
  );
}