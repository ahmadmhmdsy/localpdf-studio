/**
 * Tuning constants for the JPG-to-PDF tool (roadmap A7.4).
 *
 * Pages are measured in PDF points (1/72 inch). Pixel dimensions are converted
 * to points with the density stored in the image: using raw pixel dimensions as
 * points turns a 300 DPI photo into an oversized, nonstandard page.
 */

export const PDF_POINTS_PER_INCH = 72;

/**
 * Density assumed when an image carries no usable density metadata. 72 DPI
 * keeps the legacy 1 px = 1 pt mapping for images that do not declare a density.
 */
export const DEFAULT_IMAGE_DPI = 72;

/** Densities outside this range are treated as bad metadata and clamped. */
export const MIN_IMAGE_DPI = 36;
export const MAX_IMAGE_DPI = 1200;

export const CENTIMETRES_PER_INCH = 2.54;
export const METRES_PER_INCH = 0.0254;

/** Fixed page sizes in PDF points, portrait orientation. */
export const FIXED_PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
} as const;

/** Default page sizing: every page matches the image's own box. */
export const DEFAULT_PAGE_SIZE = 'image';

/** Default fit for fixed page sizes: keep the image whole and add equal margins. */
export const DEFAULT_FIT = 'contain';
