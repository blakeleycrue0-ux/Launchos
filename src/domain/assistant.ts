import { parseAmount } from './money';
import { simulatePurchase, type PurchaseSimulation } from './purchase';
import { UNCATEGORIZED, type MonthSummary } from './summary';
import type { Minor } from './types';

/** Datos autorizados que el asistente puede consultar. Todo son cifras ya calculadas por el dominio. */
export interface AssistantFacts {
  available: Minor;
  totalMoney: Minor;
  month: MonthSummary;
  currency: string;
  /** Reservas ya descontadas del disponible. */
  reserved: { payments: Minor; debts: Minor; savings: Minor };
  /** Pagos que vencen en los próximos 7 días. */
  weekPayments: { count: number; total: Minor };
}

export type AssistantAnswer =
  | { kind: 'spent'; amount: Minor }
  | { kind: 'income'; amount: Minor }
  | { kind: 'available'; amount: Minor }
  | { kind: 'total'; amount: Minor }
  | { kind: 'topCategory'; categoryId: string | null; amount: Minor }
  | { kind: 'noSpending' }
  | { kind: 'reserved'; payments: Minor; savings: Minor }
  | { kind: 'weekPayments'; count: number; total: Minor }
  | { kind: 'purchase'; sim: PurchaseSimulation }
  | { kind: 'unknown' };

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Respuestas CALCULADAS (sin modelo de lenguaje): detecta la intención por palabras clave
 * y devuelve cifras obtenidas con las funciones deterministas del dominio. Nunca inventa datos.
 */
export function answerQuestion(question: string, facts: AssistantFacts): AssistantAnswer {
  const q = norm(question);
  const priceMatch = q.match(/(\d[\d.,]*)/);
  if (/(puedo|podria|permit|afford|can i buy).*(compr|buy|\d)|comprar|compro/.test(q) && priceMatch) {
    const price = parseAmount(priceMatch[1], facts.currency);
    if (price && price > 0) return { kind: 'purchase', sim: simulatePurchase(facts.available, price) };
  }
  if (/(en que|donde|categoria|which|what).*(gast|spend)|gasto mas|spend (the )?most/.test(q)) {
    const top = Object.entries(facts.month.byCategory).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
    if (!top) return { kind: 'noSpending' };
    return { kind: 'topCategory', categoryId: top[0] === UNCATEGORIZED ? null : top[0], amount: top[1] };
  }
  if (/reservad|apartad|set aside|reserved/.test(q)) return { kind: 'reserved', payments: facts.reserved.payments, savings: facts.reserved.savings };
  if (/(pagos?|suscripci|payments?|bills?).*(semana|proxim|week|upcoming)|(que|what).*(pagos|payments)/.test(q)) return { kind: 'weekPayments', ...facts.weekPayments };
  if (/ingres|income|earn|cobr/.test(q)) return { kind: 'income', amount: facts.month.income };
  if (/gastad|gasto|gastos|spent|spend/.test(q)) return { kind: 'spent', amount: facts.month.spending };
  if (/disponible|puedo gastar|available|can i spend/.test(q)) return { kind: 'available', amount: facts.available };
  if (/cuanto tengo|en cuentas|saldo|balance|how much do i have/.test(q)) return { kind: 'total', amount: facts.totalMoney };
  return { kind: 'unknown' };
}
