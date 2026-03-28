import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Sector = Database["public"]["Tables"]["sectors"]["Row"];
type SectorInsert = Database["public"]["Tables"]["sectors"]["Insert"];

export const sectorService = {
  getAll: async (): Promise<Sector[]> => {
    const { data, error } = await supabase
      .from("sectors")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching sectors:", error);
      return [];
    }

    return data || [];
  },

  create: async (sector: SectorInsert): Promise<Sector> => {
    const { data, error } = await supabase
      .from("sectors")
      .insert(sector)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<SectorInsert>): Promise<Sector> => {
    const { data, error } = await supabase
      .from("sectors")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("sectors")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
};