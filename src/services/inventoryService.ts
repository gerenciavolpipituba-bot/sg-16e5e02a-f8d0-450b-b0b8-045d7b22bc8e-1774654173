import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Inventory = Database["public"]["Tables"]["inventories"]["Row"];
type InventoryInsert = Database["public"]["Tables"]["inventories"]["Insert"];
type InventoryCount = Database["public"]["Tables"]["inventory_counts"]["Row"];
type InventoryCountInsert = Database["public"]["Tables"]["inventory_counts"]["Insert"];

export const inventoryService = {
  getAll: async (): Promise<Inventory[]> => {
    const { data, error } = await supabase
      .from("inventories")
      .select(`
        *,
        inventory_counts(*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching inventories:", error);
      return [];
    }

    return data || [];
  },

  getById: async (id: string): Promise<Inventory | null> => {
    const { data, error } = await supabase
      .from("inventories")
      .select(`
        *,
        inventory_counts(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching inventory:", error);
      return null;
    }

    return data;
  },

  create: async (inventory: InventoryInsert): Promise<Inventory> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("inventories")
      .insert({
        ...inventory,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<InventoryInsert>): Promise<Inventory> => {
    const { data, error } = await supabase
      .from("inventories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("inventories")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  addCount: async (count: InventoryCountInsert): Promise<InventoryCount> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from("inventory_counts")
      .insert({
        ...count,
        counted_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  updateCount: async (id: string, updates: Partial<InventoryCountInsert>): Promise<InventoryCount> => {
    const { data, error } = await supabase
      .from("inventory_counts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getCounts: async (inventoryId: string): Promise<InventoryCount[]> => {
    const { data, error } = await supabase
      .from("inventory_counts")
      .select("*")
      .eq("inventory_id", inventoryId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching inventory counts:", error);
      return [];
    }

    return data || [];
  },

  async getCountsByInventory(inventoryId: string) {
    const { data, error } = await supabase
      .from("inventory_counts")
      .select("*")
      .eq("inventory_id", inventoryId);

    if (error) throw error;
    return data || [];
  },

  async getCounts() {
    const { data, error } = await supabase
      .from("inventory_counts")
      .select("*");

    if (error) throw error;
    return data || [];
  },

  async saveCount(countData: Omit<Database["public"]["Tables"]["inventory_counts"]["Insert"], "id" | "created_at">) {
    const { data, error } = await supabase
      .from("inventory_counts")
      .insert([countData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCount(id: string, updates: Partial<Database["public"]["Tables"]["inventory_counts"]["Update"]>) {
    const { data, error } = await supabase
      .from("inventory_counts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  subscribeToInventories: (callback: (payload: any) => void) => {
    const channel = supabase
      .channel("inventories_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventories"
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  subscribeToInventoryCounts: (callback: (payload: any) => void) => {
    const channel = supabase
      .channel("inventory_counts_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_counts"
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};