import type { SkinDefinition, SkinId } from './types';

/**
 * The skin registry. The order here controls the order shown in the picker
 * (the `order` field on each definition is a secondary sort key for explicit
 * ordering across files).
 */
export const SKINS: readonly SkinDefinition[] = [
  {
    id: 'glass',
    label: 'Glassmorphism',
    hint: 'Floating pill · dark mode by default',
    description:
      'The current LocalPDF Studio design: a floating glass pill header, ambient colored orbs and a subtle film grain. Tools sit in 28 px rounded cards with a pink / teal / yellow / lilac accent palette.',
    order: 10,
    defaultTheme: 'light',
    layout: 'floating-header',
    ambientEffects: true,
    accent: {
      primary: '#ff6b9d',
      secondary: '#6ee0c7',
      tertiary: '#c5b3ff',
    },
    radii: {
      sm: '10px',
      md: '14px',
      lg: '20px',
      xl: '28px',
    },
  },
  {
    id: 'bento',
    label: 'Bento',
    hint: 'Sidebar nav · bento grid · tighter',
    description:
      'A productivity-first layout: a persistent left sidebar, a compact search-driven topbar, a featured-bento hero, and a tighter 14 px card grid with an indigo / lime / amber / pink palette.',
    order: 20,
    defaultTheme: 'light',
    layout: 'sidebar',
    ambientEffects: false,
    accent: {
      primary: '#4f46e5',
      secondary: '#22c55e',
      tertiary: '#f59e0b',
    },
    radii: {
      sm: '8px',
      md: '10px',
      lg: '14px',
      xl: '14px',
    },
  },
];

const SKINS_BY_ID: Record<SkinId, SkinDefinition> = SKINS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<SkinId, SkinDefinition>
);

export function getSkin(id: SkinId): SkinDefinition {
  return SKINS_BY_ID[id];
}

export function isKnownSkin(value: unknown): value is SkinId {
  return typeof value === 'string' && value in SKINS_BY_ID;
}

/** Sorted copy of the registry, ready to render in the picker. */
export function listSkins(): SkinDefinition[] {
  return [...SKINS].sort((a, b) => a.order - b.order);
}
