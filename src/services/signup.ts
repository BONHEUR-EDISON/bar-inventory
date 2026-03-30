// signup.ts
import { supabase } from './supabaseClient'

export async function signupUser(email: string, password: string, orgName: string) {
  // 1. création utilisateur
  const { data: userData, error: signupError } = await supabase.auth.signUp({
    email,
    password
  })
  if (signupError) throw signupError

  // 2. création organisation
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName })
    .select()
    .single()

  if (orgError) throw orgError

  // 3. mise à jour du profile
  const { error: user_organizationsError } = await supabase
    .from('user_organizations')
    .update({ organization_id: org.id })
    .eq('user_id', userData.user?.id)

  if (user_organizationsError) throw user_organizationsError

  return { user: userData.user, organization: org }
}