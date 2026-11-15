/** Importe en unidades monetarias menores (céntimos). Siempre entero. */
export type Minor = number;
/** Fecha de calendario local YYYY-MM-DD (sin zona horaria, para evitar desfases). */
export type ISODate = string;

/**
 * 'lent'   = dinero adelantado a un grupo: sale de la cuenta, pero no es un gasto propio.
 * 'repaid' = dinero devuelto por un grupo: entra en la cuenta, pero no es un ingreso.
 */
export type TxKind = 'expense' | 'income' | 'transfer' | 'adjustment' | 'refund' | 'debt_payment' | 'lent' | 'repaid';
export type AccountKind = 'bank' | 'cash' | 'savings' | 'other';

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  initialBalanceMinor: Minor;
  currency: string;
  archived: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  /** Clave de las categorías iniciales (traducibles). null en las personalizadas. */
  key: string | null;
  name: string | null;
  icon: string;
  archived: boolean;
}

export interface Transaction {
  id: string;
  kind: TxKind;
  /** > 0 salvo en 'adjustment', donde es la diferencia con signo. */
  amountMinor: Minor;
  occurredOn: ISODate;
  accountId: string;
  /** Sólo en transferencias entre cuentas propias. */
  toAccountId: string | null;
  categoryId: string | null;
  description: string;
  notes: string;
  isRecurring: boolean;
  /** Pago recurrente que originó este movimiento (evita registrarlo dos veces). */
  recurringPaymentId?: string | null;
  /** Vínculo con un gasto o liquidación de grupo (único por usuario: evita duplicados). */
  groupRef?: string | null;
  createdAt: string;
}

export interface Profile {
  id: string;
  displayName: string;
  currency: string;
  monthlyIncomeMinor: Minor;
  intents: string[];
  onboardingStep: number;
  onboardingDone: boolean;
}

export type GroupKind = 'travel' | 'couple' | 'home' | 'friends' | 'event' | 'other';

export interface Group {
  id: string;
  name: string;
  kind: GroupKind;
  /** Clave de una fotografía predeterminada incluida en la app, o null. */
  photoPreset: string | null;
  /** Fotografía subida por el usuario (URI local del dispositivo), o null. */
  photoUri: string | null;
  currency: string;
  /** Presupuesto opcional; 0 = sin presupuesto. */
  budgetMinor: Minor;
  createdAt: string;
}

export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringPayment {
  id: string;
  name: string;
  amountMinor: Minor;
  frequency: Frequency;
  /** Próximo vencimiento pendiente. */
  nextDue: ISODate;
  /** Día del mes original (1–31): evita que un pago del 31 se quede para siempre en el 28. */
  anchorDay: number;
  accountId: string;
  categoryId: string | null;
  active: boolean;
  createdAt: string;
}

export interface GoalContribution { id: string; amountMinor: Minor; on: ISODate }

export interface Goal {
  id: string;
  name: string;
  targetMinor: Minor;
  dueDate: ISODate | null;
  /** Aportaciones (positivas) y retiradas (negativas). Lo reservado es su suma. */
  contributions: GoalContribution[];
  createdAt: string;
}

export interface Snapshot {
  profile: Profile;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  groups: Group[];
  payments: RecurringPayment[];
  goals: Goal[];
}
