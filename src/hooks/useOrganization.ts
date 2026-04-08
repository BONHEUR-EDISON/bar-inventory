// src/hooks/useOrganization.ts
import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export function useOrganization() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .single(); // si plusieurs orgs, remplacer par .maybeSingle() ou .limit(1)

      if (error) throw error;

      setOrganizationId(data?.organization_id || null);
    } catch (err) {
      console.error("Erreur récupération org:", err);
      setOrganizationId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  return { organizationId, loading };
}