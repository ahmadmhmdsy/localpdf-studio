import React, { useState } from 'react';
import { Languages, FileCheck, AlertCircle, ChevronDown } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { getGenAIAsync, SUPPORTED_LANGUAGES } from '../../lib/ai';
import { saveAs } from 'file-saver';
import { PDFDocument, rgb } from 'pdf-lib';
import { pdfjsLib } from '../../lib/pdfjs';
import { logWarn } from '../../lib/logger';
import { useToolsStore } from '../../store';
import AiConsentDialog from '../../components/tools/AiConsentDialog';
import { useI18n } from '../../i18n/useI18n';
import type { MessageKey } from '../../i18n';

type Step = 'upload' | 'language' | 'translating' | 'done' | 'error';

export default function TranslatePdf() {
  const { t, toolName, fileSize } = useI18n();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('es');
  const [progress, setProgress] = useState({ page: 0, total: 0 });
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const aiConsentGiven = useToolsStore((s) => s.aiConsentGiven);
  const setAiConsentGiven = useToolsStore((s) => s.setAiConsentGiven);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      setFile(files[0]);
      setStep('language');
      setError(null);
    }
  };

  const handleTranslate = async () => {
    if (!file) return;

    // Check consent first
    if (!aiConsentGiven) {
      setShowConsent(true);
      return;
    }

    setStep('translating');
    setError(null);

    try {
      // Resolved from the in-memory cache or the desktop store only. The web
      // build has no build-time key by design.
      const genAI = await getGenAIAsync();
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF
      const pdf = await PDFDocument.load(arrayBuffer);
      const pdfJsDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const pages = pdf.getPages();
      const totalPages = pages.length;
      
      // Embed Unicode font for translated text (supports non-Latin scripts)
      const fontUrl = '/assets/fonts/LiberationSans-Regular.ttf';
      const fontResponse = await fetch(fontUrl);
      const fontBytes = await fontResponse.arrayBuffer();
      const font = await pdf.embedFont(fontBytes);
      
      for (let i = 0; i < totalPages; i++) {
        setProgress({ page: i + 1, total: totalPages });
        
        const page = await pdfJsDoc.getPage(i + 1);
        const textContent = await page.getTextContent();
        const pdfPage = pages[i];
        const { width, height } = pdfPage.getSize();
        
        // Group text by paragraphs (approximate by Y position)
        const paragraphs = new Map<number, string[]>();
        
        for (const item of textContent.items as Array<{ str: string; transform: number[] }>) {
          const y = Math.round(item.transform[5] / 20) * 20;
          if (!paragraphs.has(y)) {
            paragraphs.set(y, []);
          }
          paragraphs.get(y)!.push(item.str);
        }
        
        // Sort by Y position and translate
        const sortedY = Array.from(paragraphs.keys()).sort((a, b) => b - a);
        
        for (const y of sortedY) {
          const text = paragraphs.get(y)!.join(' ').trim();
          if (text.length > 3) { // Skip very short text
            try {
              // Translate with Gemini
              const model = genAI.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `Translate to ${targetLang}: "${text.substring(0, 500)}"`,
              });
              const response = await model;
              const translated = response.text || text;
              
              // Draw translated text below original
              const lines = translated.match(/.{1,80}/g) || [translated];
              let currentY = height - ((height - y) / height * height) - 20;
              
              for (const line of lines.slice(0, 3)) { // Limit to 3 lines
                if (currentY > 30) {
                  pdfPage.drawText(line.substring(0, 80), {
                    x: 50,
                    y: currentY,
                    size: 9,
                    font,
                    color: rgb(0.2, 0.2, 0.8),
                    maxWidth: width - 100,
                  });
                  currentY -= 12;
                }
              }
            } catch (error) {
              // Per-block translation failures are non-fatal — we still render
              // the original text and continue with the next block.
              logWarn('Translate PDF: skipping untranslatable text block.', error);
            }
          }
        }
      }
      
      const result = await pdf.save();
      setResultData(result);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tool.translate.failedFallback'));
      setStep('error');
    }
  };

  const handleDownload = () => {
    if (resultData && file) {
      const blob = new Blob([new Uint8Array(resultData)], { type: 'application/pdf' });
      const langName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;
      const newName = file.name.replace(/\.pdf$/i, `_${langName}.pdf`);
      saveAs(blob, newName);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setTargetLang('es');
    setProgress({ page: 0, total: 0 });
    setResultData(null);
    setError(null);
  };

  return (
    <ToolLayout
      title={toolName('translate-pdf')}
      description={t('tool.translate.description')}
    >
      {step === 'upload' && (
        <FileUploadZone
          
          ariaLabel={t('tool.common.selectPdfFile')} onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title={t('tool.translate.uploadTitle')}
          subtitle={t('tool.common.dropPdfFile')}
        />
      )}

      {step === 'language' && file && (
        <div className="flex flex-col items-center gap-6 py-8 max-w-md mx-auto">
          <div className="flex items-center gap-3 bg-blue-50 px-6 py-4 rounded-xl w-full">
            <FileCheck className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-medium text-[var(--text)]">{file.name}</p>
              <p className="text-sm text-[var(--text-3)]">{fileSize(file.size)}</p>
            </div>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
              {t('tool.translate.targetLanguage')}
            </label>
            <div className="relative">
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-[var(--surface)]"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {t(`tool.translate.lang.${lang.code}` as MessageKey)}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute end-3 top-3.5 w-5 h-5 text-[var(--text-3)] pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 text-[var(--text-2)] hover:text-[var(--text)] font-medium border border-[var(--border)] rounded-xl hover:bg-[var(--surface-2)]"
            >
              {t('tool.common.cancel')}
            </button>
            <button
              onClick={handleTranslate}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              <Languages className="w-5 h-5" />
              {t('tool.translate.translate')}
            </button>
          </div>
        </div>
      )}

      {step === 'translating' && (
        <div className="flex flex-col items-center py-12">
          <ProcessingState
            title={t('tool.translate.translating')}
            description={t('tool.translate.progress', { page: progress.page, total: progress.total })}
          />
          <div className="mt-6 w-64 bg-[var(--surface-2)] rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.total > 0 ? (progress.page / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <Languages className="w-10 h-10 text-green-600" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.translate.doneTitle')}</h3>
            <p className="text-[var(--text-3)] mt-2">
              {t('tool.translate.doneBody')}
            </p>
            <p className="text-sm text-[var(--text-3)] mt-1">
              {t('tool.translate.doneNote')}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            {t('tool.translate.download')}
          </button>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('tool.translate.again')}
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.translate.failedTitle')}</h3>
            <p className="text-red-500 mt-2">{error}</p>
            <p className="text-[var(--text-3)] mt-4 text-sm">
              {t('tool.translate.apiKeyHint')}
            </p>
          </div>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('tool.common.tryAgain')}
          </button>
        </div>
      )}
      <AiConsentDialog
        isOpen={showConsent}
        onAccept={() => {
          setAiConsentGiven(true);
          setShowConsent(false);
          handleTranslate();
        }}
        onDecline={() => setShowConsent(false)}
        toolName={toolName('translate-pdf')}
      />
    </ToolLayout>
  );
}