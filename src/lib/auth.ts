import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { isSupabaseConfigured } from './config';
import { supabase } from './supabase';

interface AuthState {
  ready: boolean;
  session: Session | null;
  init: () => () => void;
}

export const useAuth = create<AuthState>((set) => ({
  ready: !isSupabaseConfigured, // modo local: no hay nada que esperar
  session: null,
  init: () => {
    if (!supabase) return () => undefined;
    supabase.auth.getSession().then(({ data }) => set({ session: data.session, ready: true })).catch(() => set({ ready: true }));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => set({ session, ready: true }));
    return () => data.subscription.unsubscribe();
  },
}));

/** 'local' en modo sin cuenta; el id del usuario autenticado en modo Supabase. */
export const currentUserId = (s: Session | null) => (isSupabaseConfigured ? s?.user.id ?? null : 'local');

export const authApi = {
  signIn: async (email: string, password: string) => {
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  },
  /** Devuelve true si hay sesión inmediata; false si hace falta confirmar el correo. */
  signUp: async (email: string, password: string) => {
    const { data, error } = await supabase!.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    return Boolean(data.session);
  },
  resetPassword: async (email: string) => {
    const { error } = await supabase!.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  },
  signOut: async () => { await supabase?.auth.signOut(); },
};
