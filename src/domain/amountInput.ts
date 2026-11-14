/** Reductor del teclado numérico: gestiona el texto del importe tecla a tecla. */
export type NumpadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'dec' | 'back';

export function pressKey(current: string, key: NumpadKey, decimals = 2, maxInt = 9): string {
  if (key === 'back') return current.slice(0, -1);
  if (key === 'dec') {
    if (decimals === 0 || current.includes('.')) return current;
    return (current === '' ? '0' : current) + '.';
  }
  const [int, frac] = current.split('.');
  if (current.includes('.')) {
    if ((frac ?? '').length >= decimals) return current;
    return current + key;
  }
  if (int === '0') return key === '0' ? current : key; // evita "00" y "05"
  if (int.length >= maxInt) return current;
  return current + key;
}

/** Texto interno ("12.5") → minor units. */
export function inputToMinor(text: string, decimals = 2): number {
  if (!text) return 0;
  const [i, f = ''] = text.split('.');
  return Number(i || '0') * 10 ** decimals + Number(f.padEnd(decimals, '0') || '0');
}

/** Para mostrar: "12.5" → "12,5" (el separador depende del idioma). */
export const displayInput = (text: string, sep = ',') => (text === '' ? '0' : text.replace('.', sep));

/** minor units → texto interno editable ("1250" → "12.5"). */
export function minorToEditText(minor: number, decimals = 2): string {
  const abs = Math.abs(minor);
  if (decimals === 0) return String(abs);
  const int = Math.floor(abs / 10 ** decimals);
  const frac = String(abs % 10 ** decimals).padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${int}.${frac}` : String(int);
}
