import { supabase } from "./supabaseClient";

export const db = {
  insert: async (table: string, data: any, organizationId: string) => {
    return supabase.from(table).insert([
      {
        ...data,
        organization_id: organizationId,
      },
    ]);
  },

  update: async (table: string, id: string, data: any) => {
    return supabase.from(table).update(data).eq("id", id);
  },

  delete: async (table: string, id: string) => {
    return supabase.from(table).delete().eq("id", id);
  },
};