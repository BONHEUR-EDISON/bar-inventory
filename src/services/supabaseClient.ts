import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

// helper pour récupérer l'organization de l'utilisateur
export async function getUserProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) return null

  const { data, error } = await supabase
    .from("user_organizations")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .maybeSingle() // plus safe que single()

  if (error) {
    console.error("Erreur récupération organization:", error)
    return null
  }

  return data
}