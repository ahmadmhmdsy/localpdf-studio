import { describe, it, expect } from 'vitest';
import { SKINS, getSkin, isKnownSkin, listSkins } from './skins';
import type { SkinDefinition, SkinId, SkinLayout } from './types';

describe('theme registry', () => {
  describe('SKINS', () => {
    it('contains at least one skin', () => {
      expect(SKINS.length).toBeGreaterThan(0);
    });

    it('every entry has the required shape', () => {
      const required: Array<keyof SkinDefinition> = [
        'id',
        'label',
        'hint',
        'description',
        'order',
        'defaultTheme',
        'layout',
        'ambientEffects',
        'accent',
        'radii',
      ];
      for (const s of SKINS) {
        for (const key of required) {
          expect(s, `skin ${s.id} is missing ${key}`).toHaveProperty(key);
        }
        expect(['light', 'dark']).toContain(s.defaultTheme);
        expect(['floating-header', 'sidebar']).toContain(s.layout);
        expect(typeof s.ambientEffects).toBe('boolean');
        expect(typeof s.accent.primary).toBe('string');
        expect(typeof s.accent.secondary).toBe('string');
        expect(typeof s.accent.tertiary).toBe('string');
        for (const r of ['sm', 'md', 'lg', 'xl'] as const) {
          expect(typeof s.radii[r]).toBe('string');
          expect(s.radii[r].length).toBeGreaterThan(0);
        }
      }
    });

    it('every id is unique', () => {
      const ids = SKINS.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('the order field is monotonic', () => {
      const orders = SKINS.map((s) => s.order);
      const sorted = [...orders].sort((a, b) => a - b);
      expect(orders).toEqual(sorted);
    });
  });

  describe('getSkin', () => {
    it('returns the matching definition for a known id', () => {
      const s = getSkin('bento');
      expect(s.id).toBe('bento');
      expect(s.layout).toBe<SkinLayout>('sidebar');
    });

    it('returns the glassmorphism definition by default', () => {
      const s = getSkin('glass');
      expect(s.id).toBe('glass');
      expect(s.layout).toBe('floating-header');
      expect(s.ambientEffects).toBe(true);
    });
  });

  describe('isKnownSkin', () => {
    it('returns true for every registered id', () => {
      for (const s of SKINS) {
        expect(isKnownSkin(s.id)).toBe(true);
      }
    });

    it('returns false for unknown ids', () => {
      expect(isKnownSkin('neon')).toBe(false);
      expect(isKnownSkin('')).toBe(false);
      expect(isKnownSkin(null)).toBe(false);
      expect(isKnownSkin(undefined)).toBe(false);
      expect(isKnownSkin(42)).toBe(false);
      expect(isKnownSkin({})).toBe(false);
    });

    it('narrows the type to SkinId when true', () => {
      const maybe: unknown = 'bento';
      if (isKnownSkin(maybe)) {
        const id: SkinId = maybe;
        expect(id).toBe('bento');
      } else {
        throw new Error('expected isKnownSkin to be true');
      }
    });
  });

  describe('listSkins', () => {
    it('returns a new sorted array', () => {
      const list = listSkins();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(SKINS.length);
      // Sorted by order
      for (let i = 1; i < list.length; i++) {
        expect(list[i - 1].order).toBeLessThanOrEqual(list[i].order);
      }
    });

    it('returns a fresh array each call (caller may mutate)', () => {
      const a = listSkins();
      const b = listSkins();
      expect(a).not.toBe(b);
    });
  });
});
