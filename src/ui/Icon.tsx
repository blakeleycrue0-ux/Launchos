import {
  ArrowDownLeft, ArrowLeftRight, ArrowUp, ArrowUpRight, Banknote, Bell, BookOpen, Bus, Calendar, CalendarClock, Camera,
  ChartNoAxesColumn, Check, ChevronDown, ChevronLeft, ChevronRight, Coins, Delete, Download, Ellipsis, Globe, Heart,
  HeartPulse, House, ImagePlus, Info, Landmark, LayoutGrid, List, Lock, LogOut, Moon, PartyPopper, Pencil, PiggyBank,
  Plane, Plus, Repeat, Scale, Search, Settings2, ShieldCheck, ShoppingBag, Sofa, Sun, Tag, Target, TextAlignStart,
  Ticket, Trash2, UserRound, UsersRound, Utensils, Wallet, X, type LucideIcon,
} from 'lucide-react-native';
import React from 'react';
import { ICON_STROKE } from '@/theme/tokens';

/**
 * Único punto de entrada de iconos: todos son de Lucide, mismo trazo y misma rejilla.
 * Los nombres de la izquierda son los que usa la app (y los que se guardan en categorías).
 */
const MAP = {
  home: House, list: List, analysis: ChartNoAxesColumn, groups: UsersRound, wallet: Wallet,
  expense: ArrowUpRight, income: ArrowDownLeft, transfer: ArrowLeftRight, plus: Plus, savings: PiggyBank,
  plane: Plane, heart: Heart, subscriptions: CalendarClock, settings: Settings2, bell: Bell, user: UserRound,
  target: Target, bag: ShoppingBag, shield: ShieldCheck,
  utensils: Utensils, bus: Bus, ticket: Ticket, pulse: HeartPulse, book: BookOpen, repeat: CalendarClock, dots: Ellipsis,
  search: Search, 'chevron-right': ChevronRight, 'chevron-left': ChevronLeft, 'chevron-down': ChevronDown,
  check: Check, close: X, trash: Trash2, backspace: Delete, download: Download, logout: LogOut, globe: Globe,
  sun: Sun, moon: Moon, layout: LayoutGrid, tag: Tag, edit: Pencil, lock: Lock, bank: Landmark, banknote: Banknote,
  scale: Scale, info: Info, calendar: Calendar, text: TextAlignStart, camera: Camera, 'image-plus': ImagePlus,
  party: PartyPopper, sofa: Sofa, coins: Coins, send: ArrowUp, recurring: Repeat,
  // alias de nombres antiguos guardados en datos
  'arrow-up-right': ArrowUpRight, 'arrow-down-left': ArrowDownLeft, swap: ArrowLeftRight, users: UsersRound, sliders: Settings2,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof MAP | (string & {});

export function Icon({ name, size = 20, color = '#000', stroke = ICON_STROKE }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const C: LucideIcon = (MAP as Record<string, LucideIcon>)[name] ?? Ellipsis;
  return <C size={size} color={color} strokeWidth={stroke} absoluteStrokeWidth={false} />;
}
