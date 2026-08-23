/**
 * Theme / skin registry — central source of truth for the app's design systems.
 *
 * To add a new skin:
 *   1. Add its `id` to `SkinId` here.
 *   2. Add a `SkinDefinition` entry in `skins.ts`.
 *   3. Drop a matching `src/theme/skins/<id>.css` file that scopes its
 *      variable overrides under `[data-skin="<id>"]` and any class rules
 *      with the `bento-*` prefix (rename the prefix as needed).
 *   4. If the new skin needs a different `Layout` chrome (e.g. toolbar,
 *      command palette) add it under `src/components/layout/SkinChrome/`
 *      and wire it from `Layout.tsx`.
 *
 * Anything in the rest of the app should consume skin data via the
 * `useSkin` hook (or `SKINS` registry) — never hardcode labels or hints.
 */

export type SkinId = 'glass' | 'bento';

/**
 * Layout strategy — controls which chrome the app renders around the route
 * outlet. Adding a new value means you also need to teach `Layout.tsx` how
 * to render it.
 */
export type SkinLayout = 'floating-header' | 'sidebar';

export interface SkinAccent {
  /** Primary accent (button color, link color, focus ring). */
  primary: string;
  /** Secondary accent (decorative gradients, success state). */
  secondary: string;
  /** Tertiary accent (warning state, secondary highlight). */
  tertiary: string;
}

export interface SkinRadii {
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface SkinDefinition {
  /** Stable id — used in the store, URL params, CSS attribute. */
  id: SkinId;
  /** Display name shown in the picker (e.g. "Glassmorphism"). */
  label: string;
  /** One-line hint shown under the label in the picker. */
  hint: string;
  /** Long description — used in the future /design-system page. */
  description: string;
  /** Sort order in the picker (ascending). */
  order: number;
  /** Which theme this skin defaults to when first activated. */
  defaultTheme: 'light' | 'dark';
  /** Which chrome Layout renders around the outlet. */
  layout: SkinLayout;
  /** Whether to render the orbs/grain ambient layer. */
  ambientEffects: boolean;
  /** Accent palette — used in previews and picker swatches. */
  accent: SkinAccent;
  /** Border-radius scale overrides (in CSS length units). */
  radii: SkinRadii;
}
