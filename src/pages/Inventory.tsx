import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  sale_price: number;
}

interface Movement {
  product_id: string;
  quantity: number;
  type: "IN" | "OUT";
  created_at: string;
}

interface Row {
  product_id: string;
  name: string;
  entriesByDate: Record<string, number>;
  outputsByDate: Record<string, number>;
  totalEntries: number;
  totalOutputs: number;
  sold: number;
  revenue: number;
}

export default function InventoryPro() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  // 🔒 Charger dernière date inventaire
  useEffect(() => {
    const loadLastInventory = async () => {
      const { data } = await supabase
        .from("inventories")
        .select("inventory_date")
        .order("inventory_date", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setStartDate(data.inventory_date.slice(0, 10));
      } else {
        setStartDate(new Date().toISOString().slice(0, 10));
      }
    };

    loadLastInventory();
  }, []);

  const getDates = () => {
    const dates = [];
    let d = new Date(startDate);
    const end = new Date(endDate);

    while (d <= end) {
      dates.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  };

  const fetchData = async () => {
    const { data: p } = await supabase.from("products").select("*");

    const { data: m } = await supabase
      .from("stock_movements")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    setProducts(p || []);
    setMovements(m || []);
  };

  useEffect(() => {
    if (startDate) fetchData();
  }, [startDate, endDate]);

  useEffect(() => {
    const dates = getDates();

    const result: Row[] = products.map((p) => {
      const entriesByDate: any = {};
      const outputsByDate: any = {};
      let totalEntries = 0;
      let totalOutputs = 0;

      dates.forEach((d) => {
        const dayMovements = movements.filter(
          (m) =>
            m.product_id === p.id &&
            m.created_at.slice(0, 10) === d
        );

        const entries = dayMovements
          .filter((m) => m.type === "IN")
          .reduce((s, m) => s + m.quantity, 0);

        const outputs = dayMovements
          .filter((m) => m.type === "OUT")
          .reduce((s, m) => s + m.quantity, 0);

        entriesByDate[d] = entries;
        outputsByDate[d] = outputs;

        totalEntries += entries;
        totalOutputs += outputs;
      });

      return {
        product_id: p.id,
        name: p.name,
        entriesByDate,
        outputsByDate,
        totalEntries,
        totalOutputs,
        sold: totalOutputs,
        revenue: totalOutputs * (p.sale_price || 0),
      };
    });

    setRows(result);
  }, [products, movements]);

  // 💾 SAVE INVENTORY
  const saveInventory = async () => {
    try {
      const user = await supabase.auth.getUser();

      const { data: org } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .single();

      const payload = rows.map((r) => ({
        product_id: r.product_id,
        real_stock: r.totalEntries - r.totalOutputs,
        unit_price: 0,
      }));

      const { error } = await supabase.rpc("process_full_inventory", {
        p_org: org?.organization_id,
        p_inventory_date: endDate,
        p_created_by: user.data.user?.id,
        p_products: payload,
      });

      if (error) throw error;

      toast.success("Inventaire enregistré !");
    } catch (err) {
      toast.error("Erreur !");
    }
  };

  const dates = getDates();

  return (
    <div className="p-6">
      <Toaster />

      <h1 className="text-2xl font-bold mb-4">Inventaire PRO</h1>

      <div className="flex gap-2 mb-4">
        <input type="date" value={startDate} disabled className="border p-2"/>
        <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="border p-2"/>
        <button onClick={saveInventory} className="bg-green-600 text-white px-4">Enregistrer</button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border">
          <thead>
            <tr>
              <th rowSpan={2}>Produit</th>
              <th colSpan={dates.length}>Entrées</th>
              <th colSpan={dates.length}>Sorties</th>
              <th rowSpan={2}>Total Entrées</th>
              <th rowSpan={2}>Total Sorties</th>
              <th rowSpan={2}>Vendu</th>
              <th rowSpan={2}>CA</th>
            </tr>
            <tr>
              {dates.map(d => <th key={"e"+d}>{d}</th>)}
              {dates.map(d => <th key={"s"+d}>{d}</th>)}
            </tr>
          </thead>

          <tbody>
            {rows.map(r => (
              <tr key={r.product_id}>
                <td>{r.name}</td>

                {dates.map(d => <td key={d}>{r.entriesByDate[d]}</td>)}
                {dates.map(d => <td key={d}>{r.outputsByDate[d]}</td>)}

                <td>{r.totalEntries}</td>
                <td>{r.totalOutputs}</td>
                <td>{r.sold}</td>
                <td>{r.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}