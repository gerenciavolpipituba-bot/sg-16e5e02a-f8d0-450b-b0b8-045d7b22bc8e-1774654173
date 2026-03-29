import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Durante o build no Vercel, as variáveis podem não estar disponíveis ainda
// Criamos um cliente "dummy" para evitar erros de build
const isDevelopment = process.env.NODE_ENV === "development";
const isBuildTime = typeof window === "undefined" && !supabaseUrl;

export const supabase = isBuildTime && !isDevelopment
  ? createClient("https://placeholder.supabase.co", "placeholder-key")
  : createClient<Database>(supabaseUrl, supabaseAnonKey);