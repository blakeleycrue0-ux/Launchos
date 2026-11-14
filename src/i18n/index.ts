import { intlLocale, useSettings, type Locale } from '@/lib/settings';
import { en } from './en';
import { es, type Dict } from './es';

export type TKey = keyof Dict;
const dicts: Record<Locale, Dict> = { es, en };

export function translate(locale: Locale, key: TKey, vars?: Record<string, string | number>): string {
  let s: string = dicts[locale][key] ?? es[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]));
  return s;
}

export function useT() {
  const locale = useSettings((s) => s.locale);
  return {
    t: (key: TKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    locale,
    intl: intlLocale(locale),
    decimalSep: locale === 'en' ? '.' : ',',
  };
}
