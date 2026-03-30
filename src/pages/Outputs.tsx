import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

interface Product {
  id: string;
  name: string;
  sale_price: number;
  final_stock: number;
  organization_id: string;
}

interface Output {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  date: string;
}

export default function Outputs() {
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingOutput, setEditingOutput] = useState<Output | null>(null);

  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 0,
    unit_price: 0,
    date: new Date().toISOString().slice(0, 10),
  });

  const [searchText, setSearchText] = useState("");

  // 🔥 GET ORGANIZATION
  const getOrganization = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    return data?.organization_id || null;
  };

  // 🔥 FETCH PRODUCTS
  const fetchProducts = async (orgId: string) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("organization_id", orgId);

    if (error) console.error(error);
    else setProducts(data || []);
  };

  // 🔥 FETCH OUTPUTS
  const fetchOutputs = async (orgId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("outputs")
      .select("*, products(name)")
      .eq("organization_id", orgId)
      .order("date", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      const formatted = data?.map((item: any) => ({
        ...item,
        product_name: item.products?.name || "Produit inconnu",
      }));

      setOutputs(formatted || []);
    }

    setLoading(false);
  };

  // 🔥 INIT
  useEffect(() => {
    const init = async () => {
      const org = await getOrganization();

      if (!org) {
        console.warn("Aucune organisation");
        return;
      }

      setOrgId(org);

      await Promise.all([fetchProducts(org), fetchOutputs(org)]);
    };

    init();
  }, []);

  // 🔥 ADD / EDIT
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.product_id || !orgId) {
      alert("Produit requis");
      return;
    }

    try {
      if (editingOutput) {
        // UPDATE
        const { error } = await supabase
          .from("outputs")
          .update(formData)
          .eq("id", editingOutput.id);

        if (error) throw error;
      } else {
        // INSERT
        const { error } = await supabase.from("outputs").insert([
          {
            ...formData,
            organization_id: orgId,
          },
        ]);

        if (error) throw error;

        // 🔥 UPDATE STOCK
        const { data: product } = await supabase
          .from("products")
          .select("final_stock")
          .eq("id", formData.product_id)
          .single();

        if (product) {
          const newStock = (product.final_stock || 0) - formData.quantity;

          if (newStock < 0) {
            alert("Stock insuffisant !");
            return;
          }

          const { error: stockError } = await supabase
            .from("products")
            .update({ final_stock: newStock })
            .eq("id", formData.product_id);

          if (stockError) throw stockError;
        }
      }

      setShowModal(false);
      fetchOutputs(orgId);
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  // 🔥 DELETE
  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette sortie ?")) return;

    const { error } = await supabase.from("outputs").delete().eq("id", id);

    if (error) console.error(error);
    else fetchOutputs(orgId!);
  };

  const handleEdit = (o: Output) => {
    setEditingOutput(o);
    setFormData({
      product_id: o.product_id,
      quantity: o.quantity,
      unit_price: o.unit_price,
      date: o.date,
    });
    setSearchText(o.product_name);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingOutput(null);
    setFormData({
      product_id: "",
      quantity: 0,
      unit_price: 0,
      date: new Date().toISOString().slice(0, 10),
    });
    setSearchText("");
    setShowModal(true);
  };

  const handleSelectProduct = (p: Product) => {
    setFormData({
      ...formData,
      product_id: p.id,
      unit_price: p.sale_price,
    });
    setSearchText(p.name);
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // UI
  if (loading) return <div className="text-center mt-10">Chargement...</div>;

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Sorties
        </h1>

        <button
          onClick={handleAdd}
          className="bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Ajouter
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {outputs.map((o) => (
          <div
            key={o.id}
            className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex justify-between"
          >
            <div>
              <div className="font-bold">{o.product_name}</div>
              <div className="text-sm text-gray-500">
                {o.quantity} × {o.unit_price}
              </div>
            </div>

            <div className="space-x-2">
              <button
                onClick={() => handleEdit(o)}
                className="bg-yellow-500 text-white px-2 py-1 rounded"
              >
                Modifier
              </button>
              <button
                onClick={() => handleDelete(o.id)}
                className="bg-red-500 text-white px-2 py-1 rounded"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md space-y-4"
          >
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">
              {editingOutput ? "Modifier" : "Ajouter"}
            </h2>

            <input
              placeholder="Rechercher produit"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full border p-2 rounded"
            />

            {filteredProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelectProduct(p)}
                className="cursor-pointer hover:bg-gray-200 p-2"
              >
                {p.name} (stock: {p.final_stock})
              </div>
            ))}

            <input
              type="number"
              placeholder="Quantité"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity: Number(e.target.value),
                })
              }
              className="w-full border p-2 rounded"
            />

            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full border p-2 rounded"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-400 rounded"
              >
                Annuler
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded">
                Valider
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}