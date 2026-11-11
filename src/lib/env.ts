import { z } from 'zod';

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
});

export type EnvResult =
  | { ok: true; supabaseUrl: string; supabaseKey: string }
  | { ok: false; missing: string[] };

export function readEnv(): EnvResult {
  const parsed = schema.safeParse(import.meta.env);
  if (!parsed.success) {
    return { ok: false, missing: parsed.error.issues.map((i) => String(i.path[0])) };
  }
  return {
    ok: true,
    supabaseUrl: parsed.data.VITE_SUPABASE_URL,
    supabaseKey: parsed.data.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
}
