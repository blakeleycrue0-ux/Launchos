/**
 * Sistema visual MIO — monocromo: carbón, blanco y grises. Sin colores de acento:
 * la jerarquía sale del tamaño, el peso y el contraste. El único color vive en la mascota.
 */
export const light = {
  scheme: 'light' as const,
  bg: '#ECECEA',
  surface: '#F7F7F5',
  surfaceAlt: '#E1E1DE',
  sunken: '#E4E4E1',
  ink: '#0B0B0C',
  inkSoft: '#5E5E63',
  inkFaint: '#9B9BA0',
  inverse: '#F7F7F5',
  line: 'rgba(11,11,12,0.08)',
  overlay: 'rgba(11,11,12,0.35)',
  shadow: '#000000',
  shadowOpacity: 0.09,
};
export const dark = {
  scheme: 'dark' as const,
  bg: '#09090A',
  surface: '#141416',
  surfaceAlt: '#212124',
  sunken: '#0E0E10',
  ink: '#F4F4F2',
  inkSoft: '#A3A3A9',
  inkFaint: '#66666C',
  inverse: '#09090A',
  line: 'rgba(255,255,255,0.09)',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
  shadowOpacity: 0.5,
};
export type Colors = typeof light | typeof dark;

export const radii = { sm: 12, md: 20, lg: 28, xl: 36, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40 } as const;
export const SCREEN_PADDING = 20;

export const fonts = {
  400: 'Manrope_400Regular',
  500: 'Manrope_500Medium',
  600: 'Manrope_600SemiBold',
  700: 'Manrope_700Bold',
  800: 'Manrope_800ExtraBold',
} as const;

export type TextVariant = 'display' | 'amount' | 'title' | 'headline' | 'body' | 'bodyStrong' | 'caption' | 'micro';
export const typography: Record<TextVariant, { size: number; weight: keyof typeof fonts; line: number; track?: number }> = {
  display: { size: 56, weight: 800, line: 60, track: -2.2 },
  amount: { size: 64, weight: 800, line: 70, track: -2.6 },
  title: { size: 30, weight: 700, line: 36, track: -0.8 },
  headline: { size: 19, weight: 700, line: 25, track: -0.3 },
  body: { size: 16, weight: 500, line: 23 },
  bodyStrong: { size: 16, weight: 700, line: 23 },
  caption: { size: 13, weight: 500, line: 18 },
  micro: { size: 11, weight: 700, line: 14, track: 0.9 },
};
