/**
 * Sistema visual MIO.
 * Negro profundo, carbón y blanco cálido; champagne metálico como único acento.
 * El modo oscuro es la referencia. Nada de lilas, neón ni degradados genéricos.
 */
export const champagne = { light: '#E9DCC3', base: '#D8C6A7', deep: '#A99576', shadow: '#5E5341' } as const;

export const dark = {
  scheme: 'dark' as const,
  bg: '#090909',
  surface: '#151515',
  surfaceAlt: '#1F1F1F',
  raised: '#242424',
  ink: '#F7F6F3',
  inkSoft: '#A9A7A1',
  inkFaint: '#6C6A65',
  inverse: '#090909',
  accent: champagne.base as string,
  accentInk: '#16130D',
  line: 'rgba(247,246,243,0.08)',
  overlay: 'rgba(0,0,0,0.62)',
  shadow: '#000000',
  shadowOpacity: 0,
};
export const light = {
  scheme: 'light' as const,
  bg: '#F7F6F3',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEEEA',
  raised: '#E8E7E4',
  ink: '#090909',
  inkSoft: '#5F5D58',
  inkFaint: '#9C9A94',
  inverse: '#F7F6F3',
  accent: champagne.deep,
  accentInk: '#16130D',
  line: 'rgba(9,9,9,0.08)',
  overlay: 'rgba(9,9,9,0.38)',
  shadow: '#1A1711',
  shadowOpacity: 0.07,
};
export type Colors = Omit<typeof dark, 'scheme'> & { scheme: 'light' | 'dark' };

export const radii = { sm: 10, md: 14, lg: 20, xl: 26, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
export const SCREEN_PADDING = 20;
/** Trazo único para todos los iconos (Lucide). */
export const ICON_STROKE = 1.75;

export const fonts = {
  400: 'Manrope_400Regular',
  500: 'Manrope_500Medium',
  600: 'Manrope_600SemiBold',
  700: 'Manrope_700Bold',
  800: 'Manrope_800ExtraBold',
} as const;

export type TextVariant = 'display' | 'amount' | 'title' | 'headline' | 'body' | 'bodyStrong' | 'caption' | 'micro';
export const typography: Record<TextVariant, { size: number; weight: keyof typeof fonts; line: number; track?: number }> = {
  display: { size: 40, weight: 700, line: 46, track: -1.4 },
  amount: { size: 46, weight: 700, line: 52, track: -1.6 },
  title: { size: 26, weight: 700, line: 32, track: -0.7 },
  headline: { size: 17, weight: 700, line: 23, track: -0.25 },
  body: { size: 15, weight: 500, line: 21 },
  bodyStrong: { size: 15, weight: 700, line: 21, track: -0.1 },
  caption: { size: 12.5, weight: 500, line: 17 },
  micro: { size: 10.5, weight: 700, line: 14, track: 1.1 },
};
