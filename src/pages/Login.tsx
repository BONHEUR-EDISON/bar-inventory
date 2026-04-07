'use client'

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";

// ============================
// Reusable Components
// ============================

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      {children}
    </div>
  );
}

function AuthHeader() {
  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-extrabold text-gray-800">B.I.M 👋</h1>
      <p className="text-gray-500 mt-2 text-sm">Connecte-toi pour continuer</p>
    </div>
  );
}

function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-600">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        value={value}
        onChange={onChange}
        required
      />
    </div>
  );
}

function ErrorAlert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
      {message}
    </div>
  );
}

function SubmitButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`w-full py-3 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition duration-200 shadow-md ${
        loading ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      {loading ? "Connexion..." : "Se connecter"}
    </button>
  );
}

// ============================
// Hook: Organization
// ============================

async function getUserOrganization(userId: string): Promise<string | null> {
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
}

// ============================
// Main Page
// ============================

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;
      if (!user || !isMounted) return;

      const orgId = await getUserOrganization(user.id);
      if (orgId) localStorage.setItem("organization_id", orgId);

      navigate("/dashboard");
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (loginError || !data.user) {
        setError(loginError?.message || "Erreur de connexion");
        return;
      }

      const orgId = await getUserOrganization(data.user.id);

      if (!orgId) {
        setError("Aucune organisation trouvée");
        return;
      }

      localStorage.setItem("organization_id", orgId);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <AuthCard>
        <AuthHeader />

        <ErrorAlert message={error} />

        <form onSubmit={handleLogin} className="space-y-5">
          <InputField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex: email@gmail.com"
          />

          <InputField
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <SubmitButton loading={loading} />
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 Bar Inventory Manager
        </p>
      </AuthCard>
    </div>
  );
}
