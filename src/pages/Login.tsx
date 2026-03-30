'use client'

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ✅ Fonction pour récupérer l'organisation d'un utilisateur
  const getUserOrganization = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle(); // Retourne null si pas de ligne

      if (error) {
        console.error("Erreur récupération org:", error);
        return null;
      }

      return data?.organization_id || null;
    } catch (err) {
      console.error("Erreur getUserOrganization:", err);
      return null;
    }
  };

  // ✅ Vérifie la session existante au montage (Strict Mode friendly)
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user || !isMounted) return;

        const orgId = await getUserOrganization(user.id);
        if (orgId) localStorage.setItem("organization_id", orgId);

        navigate("/dashboard");
      } catch (err) {
        console.error("Échec récupération session:", err);
      }
    };

    checkSession();

    return () => {
      isMounted = false; // annule les mises à jour si composant démonté
    };
  }, [navigate]);

  // ✅ Handler login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError || !data.user) {
        setError(loginError?.message || "Erreur de connexion");
        return;
      }

      const userId = data.user.id;
      const orgId = await getUserOrganization(userId);

      if (!orgId) {
        setError("Aucune organisation trouvée pour cet utilisateur");
        return;
      }

      localStorage.setItem("organization_id", orgId);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Connexion</h2>

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1 font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1 font-medium text-gray-700">Mot de passe</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className={`w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}