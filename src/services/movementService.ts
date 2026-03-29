import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Movement = Database["public"]["Tables"]["movements"]["Row"];
type MovementInsert = Database["public"]["Tables"]["movements"]["Insert"];

export const movementService = {
  getAll: async (): Promise<Movement[]> => {
    const { data, error } = await supabase
      .from("movements")
      .select(`
        *,
        product:products(name, unit),
        sector:sectors(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching movements:", error);
      return [];
    }

    return data || [];
  },

  getByProduct: async (productId: string): Promise<Movement[]> => {
    const { data, error } = await supabase
      .from("movements")
      .select(`
        *,
        product:products(name, unit),
        sector:sectors(name)
      `)
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching product movements:", error);
      return [];
    }

    return data || [];
  },

  create: async (movement: MovementInsert): Promise<Movement> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("movements")
      .insert({
        ...movement,
        created_by: user.id
      })
      .select(`
        *,
        product:products(name, unit),
        sector:sectors(name)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("movements")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  subscribeToMovements: (callback: (payload: any) => void) => {
    const channel = supabase
      .channel("movements_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "movements"
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};