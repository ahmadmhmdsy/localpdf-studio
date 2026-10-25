/**
 * Defaults and bounds for the Add Watermark tool (roadmap A7.6).
 *
 * Kept in one module so the page controls and the pdf-lib implementation share
 * the same source of truth (CLAUDE.md §6a: no magic numbers inline).
 */

/** Text pre-filled in the page and stamped when no text is supplied. */
export const DEFAULT_WATERMARK_TEXT = 'CONFIDENTIAL';

/** Default text size in points. */
export const DEFAULT_WATERMARK_FONT_SIZE = 60;

/** Smallest allowed text size in points. */
export const WATERMARK_FONT_SIZE_MIN = 4;

/** Largest allowed text size in points. */
export const WATERMARK_FONT_SIZE_MAX = 400;

/** Default opacity (0 = invisible, 1 = solid). */
export const DEFAULT_WATERMARK_OPACITY = 0.3;

/** Opacity bounds shared by the UI slider and the library validation. */
export const WATERMARK_OPACITY_MIN = 0;
export const WATERMARK_OPACITY_MAX = 1;

/** Default rotation in degrees, counter-clockwise. */
export const DEFAULT_WATERMARK_ROTATION = 45;

/** Rotation bounds offered by the UI slider. */
export const WATERMARK_ROTATION_MIN = -180;
export const WATERMARK_ROTATION_MAX = 180;

/** Default text colour: light gray, as the tool has always used. */
export const DEFAULT_WATERMARK_COLOR = { r: 0.5, g: 0.5, b: 0.5 } as const;

/** Default watermark image width as a fraction of the page width. */
export const WATERMARK_IMAGE_SCALE = 0.5;

/** Accepted image types for an image watermark (the only formats pdf-lib embeds). */
export const WATERMARK_IMAGE_TYPES = ['image/png', 'image/jpeg'] as const;
