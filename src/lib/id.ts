/** UUID v4 generado en cliente: sirve de clave de idempotencia (reintentos no duplican). */
export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-crypto').randomUUID();
}
