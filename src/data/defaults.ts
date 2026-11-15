import { newId } from '@/lib/id';
import type { Category } from '@/domain/types';

/** Categorías iniciales. `key` se traduce en la interfaz; `icon` es el nombre del icono. */
export const DEFAULT_CATEGORIES: { key: string; icon: string }[] = [
  { key: 'food', icon: 'utensils' },
  { key: 'transport', icon: 'bus' },
  { key: 'housing', icon: 'home' },
  { key: 'leisure', icon: 'ticket' },
  { key: 'shopping', icon: 'bag' },
  { key: 'health', icon: 'pulse' },
  { key: 'education', icon: 'book' },
  { key: 'subscriptions', icon: 'subscriptions' },
  { key: 'travel', icon: 'plane' },
  { key: 'other', icon: 'dots' },
];

export const seedCategories = (): Category[] =>
  DEFAULT_CATEGORIES.map((c) => ({ id: newId(), key: c.key, name: null, icon: c.icon, archived: false }));
