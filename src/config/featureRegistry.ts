/**
 * Phase 0 release-state registry (Task 1 inventory: docs/release/production-inventory.md).
 *
 * This file must stay independent of UI metadata (icons, categories) to avoid
 * circular imports: `src/constants/tools.ts` imports `ToolId` from here, so
 * nothing here may import back from `constants`.
 */

export type ReleaseState = 'stable' | 'limited' | 'disabled' | 'experimental';

export type PrivacyClass = 'local-only' | 'optional-network' | 'camera';

export type ToolId =
  | 'merge-pdf'
  | 'split-pdf'
  | 'remove-pages'
  | 'extract-pages'
  | 'organize-pdf'
  | 'scan-to-pdf'
  | 'compress-pdf'
  | 'repair-pdf'
  | 'ocr-pdf'
  | 'jpg-to-pdf'
  | 'html-to-pdf'
  | 'word-to-pdf'
  | 'excel-to-pdf'
  | 'powerpoint-to-pdf'
  | 'pdf-to-jpg'
  | 'pdf-to-pdfa'
  | 'pdf-to-word'
  | 'pdf-to-excel'
  | 'pdf-to-powerpoint'
  | 'rotate-pdf'
  | 'add-page-numbers'
  | 'add-watermark'
  | 'crop-pdf'
  | 'edit-pdf'
  | 'sign-pdf'
  | 'blackout-pdf'
  | 'compare-pdf'
  | 'decrypt-pdf'
  | 'protect-pdf'
  | 'ai-summarizer'
  | 'translate-pdf';

export interface ToolAvailability {
  releaseState: ReleaseState;
  privacy: PrivacyClass;
  support: string;
  limitation: string;
}

// Deliberately worded without success/security/completeness claims for disabled tools.
const REGISTRY: Record<ToolId, ToolAvailability> = {
  'merge-pdf': {
    releaseState: 'stable',
    privacy: 'local-only',
    support: 'No known blocking limitation for the narrow workflow',
    limitation:
      'Complex catalog/reference preservation (forms, outlines, links, tags, attachments) is not guaranteed.',
  },
  'split-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Produces extracted output; the core split path runs.',
    limitation:
      'Output is a ZIP of separate PDFs (one per range, every N pages, or one file per page); complex catalog structures such as forms, outlines and links may be lost.',
  },
  'remove-pages': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Visible pages are removed; the basic deletion path runs.',
    limitation:
      'Deleted objects may remain reachable through links, forms, or other references; not a confidentiality-safe deletion.',
  },
  'extract-pages': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Basic extraction works.',
    limitation: 'Forms/catalog structures and other references may be lost.',
  },
  'organize-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Basic editor organization works.',
    limitation:
      'Skin-dependent routes, drag-and-drop and resource limits apply; reorder arrays are not validated as complete permutations.',
  },
  'scan-to-pdf': {
    releaseState: 'disabled',
    privacy: 'camera',
    support: 'Not available — disabled pending remediation; see the production inventory for audit evidence.',
    limitation:
      'Camera access is blocked by the shipped Permissions-Policy with no image-file fallback; the desktop camera permission workflow is unverified.',
  },
  'compress-pdf': {
    releaseState: 'disabled',
    privacy: 'local-only',
    support: 'Not available — disabled pending remediation; see the production inventory for audit evidence.',
    limitation:
      'Lossy image presets, cancellation, a 100 MB limit and a never-larger fallback are implemented and unit-tested on a generated corpus, but not yet independently verified on real files; Lossless shrinks only files with unoptimized streams or metadata.',
  },
  'repair-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'The parse/resave path runs.',
    limitation:
      'Parse/resave only; a file that cannot be repaired returns a clear failure instead of a placeholder PDF.',
  },
  'ocr-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Adds a searchable, invisible text layer to scanned pages, entirely in the browser.',
    limitation:
      'English and Arabic only; cancellable; optional page range; limited to 200 pages and 50 MB; high memory use on large files.',
  },
  'jpg-to-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Browser image conversion works.',
    limitation:
      'Native MIME loss can skip picked files; photo pixels treated as PDF points produce nonstandard page sizes.',
  },
  'html-to-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Produces raster output.',
    limitation:
      'Single rasterized page for all content; no URL fetching; weak pagination/orientation for long or wide HTML.',
  },
  'word-to-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'DOCX conversion runs.',
    limitation:
      'Legacy .doc is unsupported; DOCX conversion loses structure and styling — the advertised outcome is not achieved.',
  },
  'excel-to-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'A minimal valid XLSX converted successfully in the production browser.',
    limitation:
      '.xls/CSV claims and formatting, table, and horizontal-pagination fidelity are incomplete.',
  },
  'powerpoint-to-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'PPTX conversion runs with lossy text output.',
    limitation:
      'Legacy .ppt is unsupported; PPTX output is lossy text without layout — the advertised outcome is not achieved.',
  },
  'pdf-to-jpg': {
    releaseState: 'stable',
    privacy: 'local-only',
    support: 'No known blocking limitation for the narrow workflow',
    limitation:
      'Subject to memory limits; no aggregate page/pixel/output budget.',
  },
  'pdf-to-pdfa': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Best-effort PDF/A-style metadata only; the UI warns that conformance is not validated.',
    limitation:
      'PDF/A-style metadata/OutputIntent only; the output is not PDF/A-conformant and is not validated (the web build has no veraPDF checker).',
  },
  'pdf-to-word': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'The conversion runs.',
    limitation: 'Approximate plain paragraphs, not a layout-faithful editable conversion.',
  },
  'pdf-to-excel': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'The conversion runs.',
    limitation: 'Heuristic table extraction; no guarantee of complete/correct data.',
  },
  'pdf-to-powerpoint': {
    releaseState: 'disabled',
    privacy: 'local-only',
    support: 'Not available — disabled pending remediation; see the production inventory for audit evidence.',
    limitation:
      'PNG is declared while JPEG bytes are embedded; slide-master/layout relationships are missing. Outputs are structurally suspect PPTX packages; blocked pending independent OOXML validation.',
  },
  'rotate-pdf': {
    releaseState: 'stable',
    privacy: 'local-only',
    support: 'No known blocking limitation for the narrow workflow',
    limitation:
      'Coordinate handling mixes PDF.js CropBox/rotation rendering with pdf-lib MediaBox assumptions; can misplace content on rotated/non-zero-CropBox pages at higher scope.',
  },
  'add-page-numbers': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Basic placement works.',
    limitation:
      'Six implemented positions while catalog text says nine (the implemented surface is smaller than advertised).',
  },
  'add-watermark': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Watermarking works.',
    limitation: 'Fixed text style only; some UI wording overstates image/custom behavior.',
  },
  'crop-pdf': {
    releaseState: 'stable',
    privacy: 'local-only',
    support: 'No known blocking limitation for the narrow workflow',
    limitation:
      'One shared crop for all pages; CropBox/MediaBox/origin normalization needs the unified transform (Phase 4).',
  },
  'edit-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Overlay addition works.',
    limitation: 'Adds overlays only; does not edit existing PDF text/layout.',
  },
  'sign-pdf': {
    releaseState: 'limited',
    privacy: 'local-only',
    support: 'Visual image stamp works.',
    limitation:
      'Not certificate-backed or tamper-evident signing — the advertised outcome is not achieved.',
  },
  'blackout-pdf': {
    releaseState: 'disabled',
    privacy: 'local-only',
    support: 'Not available — disabled pending remediation; see the production inventory for audit evidence.',
    limitation:
      'The editor has no redaction workflow, and the dedicated blackout path remains disabled. Neither path is a confidentiality boundary: text may remain extractable and removed content can stay reachable through underlying PDF references.',
  },
  'compare-pdf': {
    releaseState: 'stable',
    privacy: 'local-only',
    support: 'No known blocking limitation for the narrow workflow',
    limitation: 'No automatic content diff; visual comparison only.',
  },
  'decrypt-pdf': {
    releaseState: 'disabled',
    privacy: 'local-only',
    support: 'Not implemented; pdf-lib 1.17.1 does not support decryption.',
    limitation:
      'PDF decryption is not implemented. pdf-lib cannot reliably open encrypted PDFs in the browser.',
  },
  'protect-pdf': {
    releaseState: 'disabled',
    privacy: 'local-only',
    support: 'Not implemented; pdf-lib 1.17.1 does not support encryption. This is not a confidentiality boundary.',
    limitation:
      'PDF encryption is not implemented. pdf-lib save() silently ignores userPassword/ownerPassword, producing unencrypted output.',
  },
  'ai-summarizer': {
    releaseState: 'disabled',
    privacy: 'optional-network',
    support: 'Not available — disabled pending remediation; see the production inventory for audit evidence.',
    limitation:
      'Undisclosed text egress to Gemini, no consent/cancellation/limits; the summary download includes the full source text by default.',
  },
  'translate-pdf': {
    releaseState: 'disabled',
    privacy: 'optional-network',
    support: 'Not available — disabled pending remediation; see the production inventory for audit evidence.',
    limitation:
      'Per-block requests can silently skip failures while presenting the run as done; Helvetica cannot encode several advertised CJK/Arabic/Hindi targets.',
  },
};

export const TOOL_RELEASE_REGISTRY: Record<ToolId, ToolAvailability> = REGISTRY;

export function getToolAvailability(toolId: ToolId): ToolAvailability {
  return TOOL_RELEASE_REGISTRY[toolId];
}

const PRIVACY_NOTICES: Record<PrivacyClass, string> = {
  'local-only':
    'The selected file is processed in your browser. This tool does not upload the file.',
  'optional-network':
    'This tool is unavailable in the public beta. A future enabled version would send extracted content to Google Gemini only after explicit consent.',
  camera:
    'This tool is unavailable in the public beta. Camera access is not requested.',
};

export function getToolPrivacyNotice(toolId: ToolId): string {
  return PRIVACY_NOTICES[getToolAvailability(toolId).privacy];
}

export function isToolAvailable(toolId: ToolId): boolean {
  return TOOL_RELEASE_REGISTRY[toolId].releaseState !== 'disabled';
}