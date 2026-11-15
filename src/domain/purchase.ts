import type { Minor } from './types';

export type PurchaseVerdict = 'fits' | 'tight' | 'no';

export interface PurchaseSimulation {
  price: Minor;
  before: Minor;
  after: Minor;
  /** Parte del disponible actual que quedaría, 0–100 (entero, redondeo hacia abajo). */
  remainingPct: number;
  verdict: PurchaseVerdict;
}

/** Por debajo de este % del disponible actual se considera «margen reducido». */
export const TIGHT_REMAINING_PCT = 25;

/**
 * Simulación determinista de una compra. No registra nada.
 *  - no:    la compra supera el disponible (quedaría negativo) o no hay disponible.
 *  - tight: se puede pagar, pero quedaría menos del 25 % del disponible actual.
 *  - fits:  se puede pagar con margen.
 * `available` ya debe descontar pagos, deudas y ahorro reservados.
 */
export function simulatePurchase(available: Minor, price: Minor, tightPct: number = TIGHT_REMAINING_PCT): PurchaseSimulation {
  if (!Number.isInteger(price) || price <= 0) throw new Error('simulatePurchase: precio inválido');
  const after = available - price;
  const remainingPct = available > 0 && after > 0 ? Math.floor((after * 100) / available) : 0;
  const verdict: PurchaseVerdict = after < 0 ? 'no' : remainingPct < tightPct ? 'tight' : 'fits';
  return { price, before: available, after, remainingPct, verdict };
}
