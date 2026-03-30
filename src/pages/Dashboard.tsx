import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";

type Stats = {
  products: number;
  sales: number;
  entries: number;
  revenue: number;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    products: 0,
    sales: 0,
    entries: 0,
    revenue: 0,
  });

  // 🔥 fonction SAFE (évite 406)
  const getUserOrganization = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Org error:", error);
      return null;
    }

    return data?.organization_id || null;
  };

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          navigate("/");
          return;
        }

        const organizationId = await getUserOrganization(user.id);

        if (!organizationId) {
          console.warn("Pas d'organisation");
          navigate("/");
          return;
        }

        setOrgId(organizationId);

        // 🔥 requêtes parallèles optimisées
        const [productsRes, salesRes, entriesRes] = await Promise.all([
          supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId),

          supabase
            .from("outputs")
            .select("price")
            .eq("organization_id", organizationId),

          supabase
            .from("entries")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organizationId),
        ]);

        // ❌ gestion erreurs API
        if (productsRes.error || salesRes.error || entriesRes.error) {
          console.error("Stats error:", {
            productsRes,
            salesRes,
            entriesRes,
          });
          setLoading(false);
          return;
        }

        // 🔥 calcul revenue SAFE
        const revenue =
          salesRes.data?.reduce((sum, s: any) => sum + (s.price || 0), 0) || 0;

        setStats({
          products: productsRes.count || 0,
          sales: salesRes.data?.length || 0,
          entries: entriesRes.count || 0,
          revenue,
        });

        setLoading(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full text-gray-500 dark:text-gray-300">
        Chargement...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>

        <div className="text-sm text-gray-500 dark:text-gray-300">
          Organisation: {orgId}
        </div>
      </div>

      {/* STATS */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 flex-shrink-0">
        <Card title="Produits" value={stats.products} />
        <Card title="Ventes" value={stats.sales} />
        <Card title="Entrées" value={stats.entries} />
        <Card title="Revenus ($)" value={stats.revenue} />
      </div>

      {/* CHART + ACTIVITÉ */}
      <div className="grid gap-4 lg:grid-cols-3 flex-1">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 lg:col-span-2">
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">
            Ventes
          </h2>
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-gray-500">
            (Graphique ici - Recharts)
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-white">
            Activité récente
          </h2>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>+ Produit ajouté</li>
            <li>+ Vente enregistrée</li>
            <li>+ Stock mis à jour</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* 🔹 Card */
function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 flex flex-col">
      <p className="text-gray-500 dark:text-gray-400 text-sm">{title}</p>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </h2>
    </div>
  );
}