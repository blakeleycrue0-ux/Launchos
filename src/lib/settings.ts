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
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setDashboard: (patch) => set((s) => ({ dashboard: { ...s.dashboard, ...patch } })),
    }),
    { name: 'mio.settings.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const intlLocale = (l: Locale) => (l === 'en' ? 'en-GB' : 'es-ES');
