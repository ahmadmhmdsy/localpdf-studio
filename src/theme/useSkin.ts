import { useToolsStore } from '../store/toolsStore';
import { getSkin, listSkins } from './skins';
import type { SkinDefinition, SkinId } from './types';

/**
 * Typed accessor for the current skin. Returns the full definition (label,
 * hint, palette, layout strategy, ...) so consumers don't need to switch on
 * `skin` themselves — they can ask the definition for what to render.
 *
 * Subscribes to the store's `skin` field, so the component re-renders when
 * the user switches design systems.
 */
export function useSkin(): {
  /** Currently active skin id. */
  id: SkinId;
  /** Full metadata for the current skin. */
  definition: SkinDefinition;
  /** All skins, in picker order. */
  all: readonly SkinDefinition[];
  /** Switch to a different skin. */
  setSkin: (id: SkinId) => void;
  /** Convenience: does the current skin render a sidebar? */
  hasSidebar: boolean;
  /** Convenience: does the current skin render the floating pill? */
  hasFloatingHeader: boolean;
} {
  const id = useToolsStore((s) => s.skin);
  const setSkin = useToolsStore((s) => s.setSkin);

  return {
    id,
    definition: getSkin(id),
    all: listSkins(),
    setSkin,
    hasSidebar: getSkin(id).layout === 'sidebar',
    hasFloatingHeader: getSkin(id).layout === 'floating-header',
  };
}
