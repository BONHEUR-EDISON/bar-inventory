// login.ts
import { supabase } from './supabaseClient'

/**
 * Déconnexion de l'utilisateur
 */
export const logout = async (): Promise<boolean> => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Erreur lors du logout:", error.message);
    return false;
  }

  return true;
};

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw error
  return data.user
}