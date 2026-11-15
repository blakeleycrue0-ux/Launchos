import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePref = 'system' | 'light' | 'dark';
export type Locale = 'es' | 'en';
export interface DashboardSections { month: boolean; accounts: boolean; recent: boolean }

const deviceLocale = (): Locale => {
  try { return getLocales()[0]?.languageCode === 'en' ? 'en' : 'es'; } catch { return 'es'; }
};

interface SettingsState {
  theme: ThemePref;
  locale: Locale;
  dashboard: DashboardSections;
  /** Días de pagos próximos que se reservan del disponible. */
  reserveDays: number;
  /** % del disponible por debajo del cual el simulador avisa de margen reducido. */
  tightPct: number;
  /** Invitación a un grupo pendiente de aceptar (llegó por enlace antes de iniciar sesión). */
  pendingInvite: string | null;
  setReserveDays: (n: number) => void;
  setTightPct: (n: number) => void;
  setPendingInvite: (t: string | null) => void;
  setTheme: (t: ThemePref) => void;
  setLocale: (l: Locale) => void;
  setDashboard: (patch: Partial<DashboardSections>) => void;
}

/** Preferencias del dispositivo (tema, idioma, secciones del inicio). */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      locale: deviceLocale(),
      dashboard: { month: true, accounts: true, recent: true },
      reserveDays: 30,
      tightPct: 25,
      pendingInvite: null,
      setReserveDays: (reserveDays) => set({ reserveDays }),
      setTightPct: (tightPct) => set({ tightPct }),
      setPendingInvite: (pendingInvite) => set({ pendingInvite }),
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setDashboard: (patch) => set((s) => ({ dashboard: { ...s.dashboard, ...patch } })),
    }),
    { name: 'mio.settings.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const intlLocale = (l: Locale) => (l === 'en' ? 'en-GB' : 'es-ES');
