import { useState } from "react";
import { supabase } from "../services/supabaseClient";
import toast from "react-hot-toast";

interface Client {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit?: number;
}

interface Props {
  client: Client;
  onClose: () => void;
}

export default function ClientFormModal({ client, onClose }: Props) {
  const [name, setName] = useState(client.name || "");
  const [phone, setPhone] = useState(client.phone || "");
  const [email, setEmail] = useState(client.email || "");
  const [address, setAddress] = useState(client.address || "");
  const [credit, setCredit] = useState(client.credit_limit || 0);

  const saveClient = async () => {
    if (!name) return toast.error("Le nom est requis");
    const payload = { name, phone, email, address, credit_limit: credit };
    let error;
    if (client.id) {
      ({ error } = await supabase.from("clients").update(payload).eq("id", client.id));
    } else {
      ({ error } = await supabase.from("clients").insert(payload));
    }
    if (error) toast.error(error.message);
    else {
      toast.success("Client enregistré !");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold">{client.id ? "Éditer Client" : "Ajouter Client"}</h2>
        <input className="w-full border p-2 rounded" placeholder="Nom" value={name} onChange={e => setName(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Adresse" value={address} onChange={e => setAddress(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="Crédit limite" type="number" value={credit} onChange={e => setCredit(Number(e.target.value))} />

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">Annuler</button>
          <button onClick={saveClient} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}