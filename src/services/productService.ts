import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching products:", error);
      return [];
    }

    return data || [];
  },

  getById: async (id: string): Promise<Product | null> => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching product:", error);
      return null;
    }

    return data;
  },

  create: async (product: ProductInsert): Promise<Product> => {
    const { data, error } = await supabase
      .from("products")
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: Partial<ProductInsert>): Promise<Product> => {
    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  linkSectors: async (productId: string, sectorIds: string[]): Promise<void> => {
    await supabase
      .from("product_sectors")
      .delete()
      .eq("product_id", productId);

    if (sectorIds.length > 0) {
      const links = sectorIds.map(sectorId => ({
        product_id: productId,
        sector_id: sectorId
      }));

      const { error } = await supabase
        .from("product_sectors")
        .insert(links);

      if (error) throw error;
    }
  },

  getProductSectors: async (productId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from("product_sectors")
      .select("sector_id")
      .eq("product_id", productId);

    if (error) {
      console.error("Error fetching product sectors:", error);
      return [];
    }

    return data?.map(ps => ps.sector_id) || [];
  }
};