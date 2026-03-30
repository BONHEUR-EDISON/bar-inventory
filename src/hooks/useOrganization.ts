import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export function useOrganization() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrganization = async () => {
    const { data, error } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .single();

    if (error) {
      console.error("Erreur org:", error);
    } else {
      setOrganizationId(data.organization_id);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  return { organizationId, loading };
}