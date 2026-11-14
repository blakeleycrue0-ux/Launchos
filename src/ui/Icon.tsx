import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Def = { d: string[]; c?: [number, number, number][] };
const I: Record<string, Def> = {
  home: { d: ['M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'] },
  list: { d: ['M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01'] },
  wallet: { d: ['M3 7a2 2 0 0 1 2-2h12v3', 'M3 7v11a2 2 0 0 0 2 2h15V8H5a2 2 0 0 1-2-1z', 'M16 14h.01'] },
  sliders: { d: ['M4 7h9M17 7h3M4 17h3M11 17h9'], c: [[15, 7, 2], [9, 17, 2]] },
  plus: { d: ['M12 5v14M5 12h14'] },
  minus: { d: ['M5 12h14'] },
  'arrow-up-right': { d: ['M7 17L17 7M8 7h9v9'] },
  'arrow-down-left': { d: ['M17 7L7 17M16 17H7V8'] },
  swap: { d: ['M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7'] },
  search: { d: ['M20 20l-4-4'], c: [[11, 11, 7]] },
  'chevron-right': { d: ['M9 6l6 6-6 6'] },
  'chevron-left': { d: ['M15 6l-6 6 6 6'] },
  'chevron-down': { d: ['M6 9l6 6 6-6'] },
  check: { d: ['M5 12.5l4.5 4.5L19 7.5'] },
  close: { d: ['M6 6l12 12M18 6L6 18'] },
  trash: { d: ['M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3'] },
  backspace: { d: ['M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z', 'M12.5 10l4 4M16.5 10l-4 4'] },
  utensils: { d: ['M6 3v7a2 2 0 0 0 2 2v9M10 3v7a2 2 0 0 1-2 2M18 21V3c-2.5 1.5-3 5-3 8h3'] },
  bus: { d: ['M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10H4zM4 11h16M7.5 16v4M16.5 16v4M8 14h.01M16 14h.01'] },
  ticket: { d: ['M4 7h16v3a2 2 0 0 0 0 4v3H4v-3a2 2 0 0 0 0-4zM14 7v10'] },
  bag: { d: ['M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2'] },
  pulse: { d: ['M3 12h4l2.5-6 4 12 2.5-6H21'] },
  book: { d: ['M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h10'] },
  repeat: { d: ['M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4'] },
  plane: { d: ['M21 4L3 11l7 3 3 7zM10 14L21 4'] },
  dots: { d: ['M6 12h.01M12 12h.01M18 12h.01'] },
  heart: { d: ['M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'] },
  users: { d: ['M3 20a6 6 0 0 1 12 0M16 5.2a3 3 0 0 1 0 5.6M21 20a5 5 0 0 0-3.5-4.8'], c: [[9, 8, 3]] },
  shield: { d: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'] },
  sun: { d: ['M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5'], c: [[12, 12, 4]] },
  moon: { d: ['M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z'] },
  download: { d: ['M12 4v11M7 11l5 5 5-5M5 20h14'] },
  logout: { d: ['M10 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M15 8l4 4-4 4M19 12H9'] },
  user: { d: ['M4 21a8 8 0 0 1 16 0'], c: [[12, 8, 4]] },
  globe: { d: ['M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'], c: [[12, 12, 9]] },
  layout: { d: ['M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z'] },
  tag: { d: ['M3 12V4h8l10 10-8 8z', 'M7.5 8.5h.01'] },
  edit: { d: ['M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'] },
  lock: { d: ['M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3'] },
  coins: { d: ['M4 8c0 1.7 3.6 3 8 3s8-1.3 8-3-3.6-3-8-3-8 1.3-8 3zM4 8v4c0 1.7 3.6 3 8 3s8-1.3 8-3V8M4 12v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4'] },
  banknote: { d: ['M3 7h18v10H3z', 'M6 10v.01M18 14v.01'], c: [[12, 12, 2.5]] },
  scale: { d: ['M12 3v18M5 21h14M5 7l-3 7a4 4 0 0 0 6 0zM19 7l-3 7a4 4 0 0 0 6 0zM5 7h14'] },
};

export type IconName = keyof typeof I | (string & {});

export function Icon({ name, size = 22, color = '#000', stroke = 1.8 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const def = I[name] ?? I.dots;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      {def.d.map((d, i) => <Path key={i} d={d} />)}
      {def.c?.map(([cx, cy, r], i) => <Circle key={`c${i}`} cx={cx} cy={cy} r={r} />)}
    </Svg>
  );
}
