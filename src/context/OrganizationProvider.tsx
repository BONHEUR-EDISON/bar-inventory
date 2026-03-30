import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

const OrgContext = createContext<any>(null);

export function OrganizationProvider({ children }: any) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .single();

      setOrganizationId(data?.organization_id || null);
    };

    load();
  }, []);

  return (
    <OrgContext.Provider value={{ organizationId }}>
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);