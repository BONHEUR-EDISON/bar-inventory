import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import PremiumLoader3D from "./PremiumLoader3D"; // ton loader custom

type ProtectedRouteProps = {
  children: ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const checkAuth = async () => {
      try {
        // Vérifie la session active
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
          navigate("/login", { replace: true }); // redirection fluide
          return;
        }

        // Vérifie que l'utilisateur appartient à une organisation
        const { data: userOrg, error: orgError } = await supabase
          .from("user_organizations")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        if (orgError || !userOrg?.organization_id) {
          navigate("/login", { replace: true });
          return;
        }

        // utilisateur autorisé
      } catch (error) {
        console.error("Erreur vérification auth:", error);
        navigate("/login", { replace: true });
      } finally {
        // Affiche le loader au moins 500ms
        timer = setTimeout(() => setLoading(false), 500);
      }
    };

    checkAuth();

    return () => clearTimeout(timer); // cleanup du timer
  }, [navigate, location.pathname]);

  if (loading) return <PremiumLoader3D loading={false} />; // spinner pro

  return <>{children}</>;
}