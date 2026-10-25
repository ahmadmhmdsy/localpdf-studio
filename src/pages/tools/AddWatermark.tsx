import { useState, type ChangeEvent } from 'react';
import { File as FileIcon, Image as ImageIcon, X } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { addWatermark, parsePageRanges, type WatermarkOptions } from '../../lib/pdf';
import {
  DEFAULT_WATERMARK_FONT_SIZE,
  DEFAULT_WATERMARK_OPACITY,
  DEFAULT_WATERMARK_ROTATION,
  DEFAULT_WATERMARK_TEXT,
  WATERMARK_FONT_SIZE_MAX,
  WATERMARK_FONT_SIZE_MIN,
  WATERMARK_IMAGE_SCALE,
  WATERMARK_IMAGE_TYPES,
  WATERMARK_OPACITY_MAX,
  WATERMARK_OPACITY_MIN,
  WATERMARK_ROTATION_MAX,
  WATERMARK_ROTATION_MIN,
} from '../../constants/watermark';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';
import { useManagedObjectUrl } from '../../hooks/useObjectUrl';

type Step = 'upload' | 'configure' | 'processing' | 'download';

/** The two watermark sources the page offers. */
type WatermarkKind = 'text' | 'image';

interface WatermarkKindOption {
  id: WatermarkKind;
  name: string;
  description: string;
}

const WATERMARK_KIND_OPTIONS: WatermarkKindOption[] = [
  {
    id: 'text',
    name: 'Text',
    description: 'Latin (WinAnsi) characters only, drawn with a built-in PDF font.',
  },
  {
    id: 'image',
    name: 'Image',
    description: 'A PNG or JPEG logo, scaled to half the page width and centred.',
  },
];

/** Accepted image MIME types, from the shared watermark constants. */
const WATERMARK_IMAGE_ACCEPT = WATERMARK_IMAGE_TYPES.join(',');

const BYTES_PER_KB = 1024;

/**
 * Range syntax is checked before the PDF is processed. The real page count is
 * only known when the range is applied, so bounds are checked against this
 * deliberately generous limit (which also keeps a pathological "1-999999999"
 * from looping); the actual document is validated again by the library.
 */
const PAGE_RANGE_SYNTAX_CHECK_PAGES = 100_000;

const PAGE_RANGE_ERROR = 'Enter page numbers or ranges separated by commas, like 1-3, 5.';
const FONT_SIZE_ERROR = `Enter a font size from ${WATERMARK_FONT_SIZE_MIN} to ${WATERMARK_FONT_SIZE_MAX} points.`;

function validatePageRange(value: string): string | null {
  if (value.trim().length === 0) {
    return null;
  }
  try {
    parsePageRanges(value, PAGE_RANGE_SYNTAX_CHECK_PAGES);
    return null;
  } catch {
    return PAGE_RANGE_ERROR;
  }
}

function isWatermarkImageFile(file: File): boolean {
  return (WATERMARK_IMAGE_TYPES as readonly string[]).includes(file.type);
}

/** Format for the library, or undefined so it can fall back to the file name. */
function watermarkImageType(file: File): 'png' | 'jpeg' | undefined {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') return 'jpeg';
  return undefined;
}

function formatKilobytes(bytes: number): string {
  return `${(bytes / BYTES_PER_KB).toFixed(0)} KB`;
}

export default function AddWatermark() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<WatermarkKind>('text');
  const [watermarkText, setWatermarkText] = useState<string>(DEFAULT_WATERMARK_TEXT);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fontSize, setFontSize] = useState<string>(String(DEFAULT_WATERMARK_FONT_SIZE));
  const [opacity, setOpacity] = useState<number>(DEFAULT_WATERMARK_OPACITY);
  const [rotation, setRotation] = useState<number>(DEFAULT_WATERMARK_ROTATION);
  const [pageRange, setPageRange] = useState<string>('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const { showToast } = useToast();
  const { create: createObjectUrl, revoke: revokeObjectUrl } = useManagedObjectUrl();

  const fontSizeValue = Number(fontSize);
  const fontSizeIsValid =
    Number.isFinite(fontSizeValue) &&
    fontSizeValue >= WATERMARK_FONT_SIZE_MIN &&
    fontSizeValue <= WATERMARK_FONT_SIZE_MAX;
  const pageRangeError = validatePageRange(pageRange);
  const hasText = watermarkText.trim().length > 0;
  const kindIsReady = kind === 'text' ? hasText && fontSizeIsValid : imageFile !== null;
  const canSubmit = kindIsReady && pageRangeError === null;

  const handleFilesSelected = (newFiles: File[]) => {
    if (newFiles.length > 0) {
      setFile(newFiles[0]);
      setStep('configure');
    }
  };

  const handleImageSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    if (selected && !isWatermarkImageFile(selected)) {
      showToast({ message: 'Choose a PNG or JPEG image.', type: 'warning' });
      event.target.value = '';
      return;
    }
    setImageFile(selected);
  };

  const handleProcess = async () => {
    if (!file || !canSubmit) {
      showToast({ message: 'Check the watermark settings and try again.', type: 'warning' });
      return;
    }

    const range = pageRange.trim();
    const sharedOptions = {
      opacity,
      rotation,
      ...(range ? { pageRange: range } : {}),
    };
    let options: WatermarkOptions;
    if (kind === 'text') {
      options = { ...sharedOptions, text: watermarkText.trim(), fontSize: fontSizeValue };
    } else {
      // canSubmit guarantees an image in image mode.
      const image = imageFile as File;
      const imageType = watermarkImageType(image);
      options = { ...sharedOptions, image, ...(imageType ? { imageType } : {}) };
    }

    setStep('processing');
    try {
      const pdfBytes = await addWatermark(file, options);

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = createObjectUrl(blob);

      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setStep('download');
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      logError('Error adding watermark:', normalizedError);
      showToast({
        message: normalizedError.message || 'An error occurred. Please try again.',
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    }
  };

  const startOver = () => {
    setFile(null);
    setKind('text');
    setWatermarkText(DEFAULT_WATERMARK_TEXT);
    setImageFile(null);
    setFontSize(String(DEFAULT_WATERMARK_FONT_SIZE));
    setOpacity(DEFAULT_WATERMARK_OPACITY);
    setRotation(DEFAULT_WATERMARK_ROTATION);
    setPageRange('');
    revokeObjectUrl();
    setResultUrl(null);
    setStep('upload');
  };

  return (
    <ToolLayout
      title="Add Watermark"
      description="Stamp text or a PNG/JPEG image over your PDF, with your chosen size, opacity, rotation and page range."
    >
      {step === 'upload' && (
        <FileUploadZone

          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected}
          title="Select PDF file"
          subtitle="or drop PDF here"
          maxFiles={1}
        />
      )}

      {step === 'configure' && file && (
        <div className="w-full max-w-4xl">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm shadow-inner shadow-[var(--border)]/40 p-8 mb-8">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon size={24} className="text-purple-600" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-[var(--text)] text-lg">{file.name}</span>
                  <span className="text-sm text-[var(--text-3)]">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
              <button
                onClick={startOver}
                className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                aria-label="Remove file"
              >
                <X size={24} />
              </button>
            </div>

            <fieldset className="mb-8">
              <legend className="block text-sm font-medium text-[var(--text-2)] mb-3">
                Watermark type
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WATERMARK_KIND_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      kind === option.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-[var(--border)] hover:border-purple-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="watermark-kind"
                      value={option.id}
                      checked={kind === option.id}
                      onChange={() => setKind(option.id)}
                      className="sr-only"
                    />
                    <span
                      className={`mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        kind === option.id ? 'border-purple-500 bg-purple-500' : 'border-[var(--border)]'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="flex flex-col">
                      <span className="font-semibold text-[var(--text)]">{option.name}</span>
                      <span className="text-sm text-[var(--text-3)]">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {kind === 'text' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="watermarkText" className="block text-sm font-medium text-[var(--text-2)]">
                    Watermark text
                  </label>
                  <input
                    type="text"
                    id="watermarkText"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g., CONFIDENTIAL"
                    aria-describedby="watermark-text-hint"
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                  <p id="watermark-text-hint" className="text-sm text-[var(--text-3)]">
                    Built-in PDF fonts cover Latin (WinAnsi) characters only, so non-Latin text such
                    as Arabic or Chinese is rejected rather than dropped silently. Use an image
                    watermark for those scripts.
                  </p>
                </div>

                <div className="space-y-2 max-w-xs">
                  <label htmlFor="watermarkFontSize" className="block text-sm font-medium text-[var(--text-2)]">
                    Font size (pt)
                  </label>
                  <input
                    type="number"
                    id="watermarkFontSize"
                    min={WATERMARK_FONT_SIZE_MIN}
                    max={WATERMARK_FONT_SIZE_MAX}
                    step={1}
                    inputMode="numeric"
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    aria-invalid={!fontSizeIsValid}
                    aria-describedby={fontSizeIsValid ? undefined : 'watermark-font-size-error'}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                  {!fontSizeIsValid && (
                    <p id="watermark-font-size-error" role="alert" className="text-sm text-red-600">
                      {FONT_SIZE_ERROR}
                    </p>
                  )}
                </div>
              </div>
            )}

            {kind === 'image' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="watermarkImage" className="block text-sm font-medium text-[var(--text-2)]">
                    Watermark image
                  </label>
                  <input
                    type="file"
                    id="watermarkImage"
                    accept={WATERMARK_IMAGE_ACCEPT}
                    onChange={handleImageSelected}
                    aria-describedby="watermark-image-hint"
                    className="block w-full text-sm text-[var(--text-2)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                  />
                  <p id="watermark-image-hint" className="text-sm text-[var(--text-3)]">
                    PNG or JPEG only. The image is scaled to {Math.round(WATERMARK_IMAGE_SCALE * 100)}% of
                    each page&apos;s width and centred.
                  </p>
                </div>

                {imageFile && (
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <ImageIcon size={20} className="text-purple-600 flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-[var(--text)] truncate">{imageFile.name}</span>
                        <span className="text-sm text-[var(--text-3)]">{formatKilobytes(imageFile.size)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setImageFile(null)}
                      className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      aria-label="Remove watermark image"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="watermarkOpacity" className="block text-sm font-medium text-[var(--text-2)]">
                    Opacity
                  </label>
                  <output htmlFor="watermarkOpacity" className="text-sm font-medium text-[var(--text-2)]">
                    {Math.round(opacity * 100)}%
                  </output>
                </div>
                <input
                  type="range"
                  id="watermarkOpacity"
                  min={WATERMARK_OPACITY_MIN}
                  max={WATERMARK_OPACITY_MAX}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="watermarkRotation" className="block text-sm font-medium text-[var(--text-2)]">
                    Rotation
                  </label>
                  <output htmlFor="watermarkRotation" className="text-sm font-medium text-[var(--text-2)]">
                    {rotation}°
                  </output>
                </div>
                <input
                  type="range"
                  id="watermarkRotation"
                  min={WATERMARK_ROTATION_MIN}
                  max={WATERMARK_ROTATION_MAX}
                  step={5}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>
            </div>

            <div className="space-y-2 mt-8">
              <label htmlFor="watermarkPageRange" className="block text-sm font-medium text-[var(--text-2)]">
                Pages
              </label>
              <input
                type="text"
                id="watermarkPageRange"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="All pages"
                aria-invalid={pageRangeError !== null}
                aria-describedby={pageRangeError ? 'watermark-page-range-error' : 'watermark-page-range-hint'}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              />
              {pageRangeError ? (
                <p id="watermark-page-range-error" role="alert" className="text-sm text-red-600">
                  {pageRangeError}
                </p>
              ) : (
                <p id="watermark-page-range-hint" className="text-sm text-[var(--text-3)]">
                  Leave empty to stamp every page, or enter page numbers and ranges like 1-3, 5.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleProcess}
              disabled={!canSubmit}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              Add Watermark
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Adding Watermark..."
          description="Please wait while we stamp your document. This is happening locally in your browser."
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState
          title="Watermark added successfully!"
          description="Your document has been stamped with the watermark."
          fileName={`watermarked_${file?.name || 'document.pdf'}`}
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}
