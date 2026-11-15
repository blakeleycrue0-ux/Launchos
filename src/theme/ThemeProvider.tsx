import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { useSettings } from '@/lib/settings';
import { dark, light, type Colors } from './tokens';

const Ctx = createContext<Colors>(dark);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const pref = useSettings((s) => s.theme);
  const colors = useMemo<Colors>(() => ((pref === 'system' ? system ?? 'dark' : pref) === 'light' ? light : dark), [pref, system]);
  // Web: el fondo de la página y la barra del navegador siguen al tema (sin franjas de otro color en iPhone).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = colors.bg;
    document.body.style.backgroundColor = colors.bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.bg);
  }, [colors]);
  return <Ctx.Provider value={colors}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);

/** Fuerza un tema en un subárbol (p. ej. la bienvenida siempre oscura). */
export function ForceTheme({ colors, children }: { colors: Colors; children: React.ReactNode }) {
  return <Ctx.Provider value={colors}>{children}</Ctx.Provider>;
}
