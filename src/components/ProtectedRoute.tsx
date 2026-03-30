import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../services/supabaseClient";
import { useNavigate } from "react-router-dom";

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);

      // Vérifie la session active
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        navigate("/"); // pas connecté
        setLoading(false);
        return;
      }

      // Vérifie l'organisation
      const { data: userOrg, error: orgError } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", user.id)
        .single();

      if (orgError || !userOrg?.organization_id) {
        navigate("/"); // pas d'organisation
        setLoading(false);
        return;
      }

      // autorisé
      setLoading(false);
    };

    checkAuth();
  }, [navigate]);

  if (loading) return <div>Chargement...</div>;

  return <>{children}</>;
}