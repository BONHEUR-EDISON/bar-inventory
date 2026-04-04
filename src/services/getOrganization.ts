// src/services/getOrganization.ts
import { supabase } from "./supabaseClient"; 

export async function getOrganization(userId: string) {
  const { data: user_organizations, error } = await supabase
    .from('user_organizations')
    .select('organization_id')
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  return user_organizations.organization_id;
}