import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '@/lib/settings';
import { dark, light, type Colors } from './tokens';

const Ctx = createContext<Colors>(light);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useSettings((s) => s.theme);
  const colors = useMemo(() => ((pref === 'system' ? system : pref) === 'dark' ? dark : light), [pref, system]);
  return <Ctx.Provider value={colors}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

/** Fuerza un tema en un subárbol (p. ej. la bienvenida siempre oscura). */
export function ForceTheme({ colors, children }: { colors: Colors; children: React.ReactNode }) {
  return <Ctx.Provider value={colors}>{children}</Ctx.Provider>;
}
