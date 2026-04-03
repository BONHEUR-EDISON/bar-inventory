import { supabase } from "../services/supabaseClient";

export const logout = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Erreur logout:", error.message);
    return false;
  }

  return true;
};