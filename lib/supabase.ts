import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export function getSupabaseClient() {
  if (!isSupabaseConfigured) return null;
  return createClient(env.supabaseUrl, env.supabaseAnonKey);
}

export function getSupabaseAdmin() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
