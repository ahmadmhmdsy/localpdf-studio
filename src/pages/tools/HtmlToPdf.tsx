import { useState, useRef } from 'react';
import { FileText, Code } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import DOMPurify from 'dompurify';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';

type Step = 'input' | 'processing' | 'download';

export default function HtmlToPdf() {
  const [step, setStep] = useState<Step>('input');
  const [htmlContent, setHtmlContent] = useState<string>('<h1>Hello World</h1><p>This is a sample HTML content to convert to PDF.</p>');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');

  const previewRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const handleProcess = async () => {
    if (!htmlContent) {
      showToast({ message: 'Please enter some HTML content.', type: 'warning' });
      return;
    }

    setStep('processing');
    try {
      if (previewRef.current) {
        const dataUrl = await toJpeg(previewRef.current, {
          quality: 1.0,
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        });

        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [img.width / 2, img.height / 2]
        });

        pdf.addImage(dataUrl, 'JPEG', 0, 0, img.width / 2, img.height / 2);
        const pdfBlob = pdf.output('blob');

        const blobUrl = URL.createObjectURL(pdfBlob);
        setResultUrl(blobUrl);
        setResultSize((pdfBlob.size / 1024 / 1024).toFixed(2) + ' MB');
        setStep('download');
      }
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
    setStep('input');
  };

  return (
    <ToolLayout
      title="HTML to PDF"
      description="Paste HTML to render it to a PDF. Note: only the content you paste is rendered — external URLs are not supported in the browser."
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

                <div className="mt-8">
                  <h3 className="text-sm font-medium text-[var(--text-2)] mb-4">Preview</h3>
                  <div
                    ref={previewRef}
                    className="border border-[var(--border)] rounded-xl p-8 bg-[var(--surface)] min-h-[400px] prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleProcess}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg flex items-center gap-2"
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
          description="Please wait while we render your HTML and generate the PDF document."
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState
          title="PDF generated successfully!"
          description="Your HTML has been converted to a PDF document."
          fileName="webpage.pdf"
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}