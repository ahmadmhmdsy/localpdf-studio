import { useMemo, useRef, useState } from 'react';
import { FileText, Code } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import DOMPurify from 'dompurify';
import { getPageDimensions, htmlToPdf, type HtmlToPdfOrientation } from '../../lib/htmlToPdf';
import { HTML_TO_PDF_OFFSCREEN_LEFT_PX } from '../../constants/htmlToPdf';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';

type Step = 'input' | 'processing' | 'download';

export default function HtmlToPdf() {
  const [step, setStep] = useState<Step>('input');
  const [htmlContent, setHtmlContent] = useState<string>('<h1>Hello World</h1><p>This is a sample HTML content to convert to PDF.</p>');
  const [orientation, setOrientation] = useState<HtmlToPdfOrientation>('portrait');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const [resultPages, setResultPages] = useState<number>(0);

  const captureRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const sanitizedHtml = useMemo(() => DOMPurify.sanitize(htmlContent), [htmlContent]);
  const pageSize = getPageDimensions(orientation);
  const hasContent = htmlContent.trim().length > 0;

  const handleProcess = async () => {
    if (!hasContent) {
      showToast({ message: 'Please enter some HTML content.', type: 'warning' });
      return;
    }

    const captureElement = captureRef.current;
    if (!captureElement) {
      showToast({ message: 'An error occurred. Please try again.', type: 'error', duration: 5000 });
      return;
    }

    setStep('processing');
    try {
      const { blob, pageCount } = await htmlToPdf(captureElement, { orientation });

      const blobUrl = URL.createObjectURL(blob);
      setResultUrl(blobUrl);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setResultPages(pageCount);
      setStep('download');
    } catch (error) {
      logError('Error converting HTML to PDF:', error);
      showToast({
        message: 'An error occurred. Please try again.',
        type: 'error',
        duration: 5000,
      });
      setStep('input');
    }
  };

  const startOver = () => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setResultPages(0);
    setStep('input');
  };

  const orientationButtonClass = (value: HtmlToPdfOrientation) =>
    `px-6 py-2.5 rounded-xl border font-medium transition-colors ${
      orientation === value
        ? 'bg-red-50 border-red-500 text-red-700'
        : 'border-[var(--border)] text-[var(--text-2)] hover:bg-[var(--surface-2)]'
    }`;

  return (
    <ToolLayout
      title="HTML to PDF"
      description="Paste HTML to render it into an A4 PDF. The result is a raster image (text is not selectable), and only the HTML you paste is rendered — external URLs are not fetched."
    >
      {step === 'input' && (
        <div className="w-full max-w-4xl mx-auto">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden mb-8">
            <div className="flex border-b border-[var(--border)]">
              <div className="flex-1 py-4 px-6 text-center font-medium flex items-center justify-center gap-2 bg-red-50 text-red-600 border-b-2 border-red-600">
                <Code size={18} />
                HTML Code
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-[var(--text-2)]">
                  Paste your HTML code here
                </label>
                <textarea
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  className="w-full h-64 p-4 border border-[var(--border)] rounded-xl font-mono text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                  placeholder="<h1>Your HTML here</h1>"
                />

                <div>
                  <span className="block text-sm font-medium text-[var(--text-2)] mb-3">
                    Page orientation
                  </span>
                  <div className="flex gap-3" role="group" aria-label="Page orientation">
                    <button
                      type="button"
                      onClick={() => setOrientation('portrait')}
                      aria-pressed={orientation === 'portrait'}
                      className={orientationButtonClass('portrait')}
                    >
                      Portrait
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation('landscape')}
                      aria-pressed={orientation === 'landscape'}
                      className={orientationButtonClass('landscape')}
                    >
                      Landscape
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-3)] mt-2">
                    Landscape suits wide content. Pages are A4 either way.
                  </p>
                </div>

                <div className="mt-8">
                  <h3 className="text-sm font-medium text-[var(--text-2)] mb-4">Preview</h3>
                  <div
                    className="border border-[var(--border)] rounded-xl p-8 bg-[var(--surface)] min-h-[400px] prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleProcess}
              disabled={!hasContent}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={24} />
              Convert to PDF
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Converting to PDF..."
          description="Please wait while we render your HTML and paginate it into A4 pages."
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState
          title="PDF generated successfully!"
          description={
            resultPages > 1
              ? `Your HTML was converted into a ${resultPages}-page A4 PDF.`
              : 'Your HTML was converted into a single A4 PDF page.'
          }
          fileName="webpage.pdf"
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}

      {/*
        Hidden, fixed-width capture target: html-to-image rasterises this node,
        never the responsive preview, so page breaks do not depend on the window
        size. It sits outside the step blocks so it stays mounted while the
        conversion runs.
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: HTML_TO_PDF_OFFSCREEN_LEFT_PX,
          top: 0,
          pointerEvents: 'none',
        }}
      >
        <div
          ref={captureRef}
          data-testid="html-pdf-capture"
          className="bg-white text-black p-8"
          style={{ width: `${pageSize.widthPx}px` }}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    </ToolLayout>
  );
}
