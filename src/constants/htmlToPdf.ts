/**
 * A4 page geometry and raster-capture settings for the HTML → PDF tool.
 *
 * The output page is always A4 (210 mm × 297 mm). Layout and rasterisation
 * use CSS pixels at the 96 dpi reference resolution, while jsPDF receives the
 * standard A4 page name. Keeping the geometry here means the captured slice
 * size and the PDF page size stay in sync and can be reviewed in one place.
 */

export const MM_PER_INCH = 25.4;
export const CSS_PX_PER_INCH = 96;

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

export const A4_WIDTH_CSS_PX = (A4_WIDTH_MM / MM_PER_INCH) * CSS_PX_PER_INCH;
export const A4_HEIGHT_CSS_PX = (A4_HEIGHT_MM / MM_PER_INCH) * CSS_PX_PER_INCH;

/**
 * Fixed capture size. The document is always rendered at the width of the page
 * it is printed on (never at the viewport width), so page breaks are stable
 * regardless of the window size. Landscape swaps the two values.
 */
export const HTML_TO_PDF_RENDER_WIDTH_PX = A4_WIDTH_CSS_PX;
export const HTML_TO_PDF_RENDER_HEIGHT_PX = A4_HEIGHT_CSS_PX;

/** Capture at 2× the CSS resolution so small text stays legible in the raster. */
export const HTML_TO_PDF_PIXEL_RATIO = 2;

/** JPEG quality for the per-page raster. The output is image-only, so keep it high. */
export const HTML_TO_PDF_JPEG_QUALITY = 0.95;

/** Paper-white backdrop so transparent pasted HTML is readable. */
export const HTML_TO_PDF_BACKGROUND_COLOR = '#ffffff';

/**
 * Offscreen x offset for the hidden capture node. The node stays laid out at
 * the fixed page width so html-to-image can measure and rasterise it, but it
 * never appears in the visible UI.
 */
export const HTML_TO_PDF_OFFSCREEN_LEFT_PX = -10000;
