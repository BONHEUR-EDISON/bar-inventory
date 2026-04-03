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

  // Récupérer l'organisation de l'utilisateur
  const getUserOrganization = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("user_organizations")
        .select("organization_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erreur récupération org:", error);
        return null;
      }

      return data?.organization_id || null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  // Vérifie la session existante
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user || !isMounted) return;

      const orgId = await getUserOrganization(user.id);
      if (orgId) localStorage.setItem("organization_id", orgId);

      navigate("/dashboard");
    };

    checkSession();

    return () => { isMounted = false; };
  }, [navigate]);

  // Connexion
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
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

      const orgId = await getUserOrganization(data.user.id);

      if (!orgId) {
        setError("Aucune organisation trouvée pour cet utilisateur");
        return;
      }

      localStorage.setItem("organization_id", orgId);
      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800">Welcome Back 👋</h1>
          <p className="text-gray-500 mt-2 text-sm">Connecte-toi pour continuer</p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-600">Email</label>
            <input
              type="email"
              placeholder="ex: email@gmail.com"
              className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition duration-200 shadow-md ${
              loading ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        {/* FOOTER */}
        <p className="text-center text-xs text-gray-400 mt-6">© 2026 MyApp</p>
      </div>
    </div>
  );
}