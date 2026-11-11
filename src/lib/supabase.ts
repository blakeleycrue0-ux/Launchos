import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { readEnv } from './env';

export type TypedSupabaseClient = SupabaseClient<Database>;

const env = readEnv();

/**
 * Cliente único de Supabase. Es null si faltan variables de entorno; en ese
 * caso la app muestra una pantalla de configuración en lugar de fallar.
 */
export const supabase: TypedSupabaseClient | null = env.ok
  ? createClient<Database>(env.supabaseUrl, env.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export const envStatus = env;

export function getSupabase(): TypedSupabaseClient {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}
