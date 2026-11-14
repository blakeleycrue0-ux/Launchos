import type { Minor } from './types';

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'CLP', 'VND']);
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'CHF', 'CAD', 'JPY'] as const;

export function currencyExponent(currency: string): number {
  return ZERO_DECIMAL.has(currency) ? 0 : 2;
}

/**
 * "12,50" | "12.50" | "1.234,56" → 1250. Devuelve null si no es un importe válido.
 * Regla: el último separador es decimal si tras él hay ≤ decimales de la moneda;
 * si hay exactamente 3 dígitos se interpreta como separador de miles ("1.234" → 1234).
 */
export function parseAmount(input: string, currency = 'EUR'): Minor | null {
  const exp = currencyExponent(currency);
  let s = input.trim().replace(/\s/g, '');
  if (!s) return null;
  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);
  const sep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  let intPart = s;
  let frac = '';
  if (sep >= 0) {
    const after = s.slice(sep + 1);
    if (after.length <= exp) {
      intPart = s.slice(0, sep);
      frac = after;
    } else if (after.length !== 3) {
      return null;
    }
  }
  intPart = intPart.replace(/[.,]/g, '');
  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(frac)) return null;
  if (!intPart && !frac) return null;
  const minor = Number(intPart || '0') * 10 ** exp + Number(frac.padEnd(exp, '0') || '0');
  if (!Number.isSafeInteger(minor)) return null;
  return neg ? -minor : minor;
}

export function minorToNumber(minor: Minor, currency: string): number {
  return minor / 10 ** currencyExponent(currency);
}

export function formatMoney(
  minor: Minor,
  currency: string,
  locale = 'es-ES',
  opts: { sign?: boolean; compact?: boolean } = {},
): string {
  const exp = currencyExponent(currency);
  const value = minor / 10 ** exp;
  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: opts.compact && Number.isInteger(value) ? 0 : exp,
    maximumFractionDigits: exp,
    signDisplay: opts.sign ? 'exceptZero' : 'auto',
  });
  return fmt.format(value);
}

/** Texto numérico editable: "1250" → "12,50" usando el separador del idioma. */
export function minorToInput(minor: Minor, currency: string, decimalSep = ','): string {
  const exp = currencyExponent(currency);
  if (exp === 0) return String(Math.abs(minor));
  const abs = Math.abs(minor);
  const int = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, '0').replace(/0+$/, '');
  return frac ? `${int}${decimalSep}${frac}` : String(int);
}

/**
 * Reparte `total` en partes proporcionales a `weights` sin perder ni crear céntimos
 * (método del mayor resto; los empates se resuelven por orden → determinista).
 */
export function allocate(total: Minor, weights: number[]): Minor[] {
  if (!weights.length) return [];
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new Error('allocate: la suma de pesos debe ser > 0');
  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const raw = weights.map((w) => (abs * w) / sum);
  const base = raw.map(Math.floor);
  let rest = abs - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0; k++, rest--) base[order[k % order.length].i] += 1;
  return base.map((v) => v * sign);
}

export const splitEqually = (total: Minor, parts: number): Minor[] => allocate(total, Array(parts).fill(1));

/** Símbolo de la moneda en el idioma dado ("€", "$"). */
export function currencySymbol(currency: string, locale = 'es-ES'): string {
  const part = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency');
  return part?.value ?? currency;
}
