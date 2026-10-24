import React, { useState } from 'react';
import { Sparkles, FileText, Copy, Check, Download } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { extractPdfText, summarizePdf } from '../../lib/ai';
import { useToolsStore } from '../../store';
import AiConsentDialog from '../../components/tools/AiConsentDialog';

type Step = 'upload' | 'extracting' | 'summarizing' | 'done' | 'error';

export default function AiSummarizer() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [summary, setSummary] = useState('');
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [summarizationProgress, setSummarizationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const aiConsentGiven = useToolsStore((s) => s.aiConsentGiven);
  const setAiConsentGiven = useToolsStore((s) => s.setAiConsentGiven);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      setFile(files[0]);
      setError(null);
      handleSummarize(files[0]);
    }
  };

  const handleSummarize = async (selectedFile: File) => {
    // Check consent first
    if (!aiConsentGiven) {
      setShowConsent(true);
      return;
    }
    try {
      // Step 1: Extract text
      setStep('extracting');
      const text = await extractPdfText(selectedFile, (page, total) => {
        setExtractionProgress(Math.round((page / total) * 100));
      });
      setExtractedText(text);

      // Step 2: Summarize
      setStep('summarizing');
      const summaryResult = await summarizePdf(text, (chunk, total) => {
        const pct = Math.round((chunk / total) * 100);
        setSummarizationProgress(pct);
      });
      setSummary(summaryResult);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to summarize PDF');
      setStep('error');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob(
      [`# Summary of ${file?.name || 'PDF'}\n\n${summary}\n\n---\n\n# Original Text\n\n${extractedText}`],
      { type: 'text/markdown' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.replace(/\.pdf$/i, '') || 'document'}_summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setExtractedText('');
    setSummary('');
    setExtractionProgress(0);
    setError(null);
    setCopied(false);
  };

  return (
    <ToolLayout
      title="AI Summarizer"
      description="Get an AI-generated summary of your PDF content using Google Gemini."
    >
      {step === 'upload' && (
        <FileUploadZone
          
          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title="Select a PDF to summarize"
          subtitle="or drop PDF file here"
        />
      )}

      {step === 'extracting' && (
        <ProcessingState
          title="Extracting text..."
          description={`Processing page content... ${extractionProgress}%`}
        />
      )}

      {step === 'summarizing' && (
        <ProcessingState
          title="Generating summary..."
          description={`AI is analyzing the content... ${summarizationProgress}%`}
        />
      )}

      {step === 'done' && (
        <div className="flex flex-col gap-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text)]">AI Summary Generated</h3>
                <p className="text-sm text-[var(--text-3)]">{file?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 text-[var(--text-2)] bg-[var(--surface-2)] rounded-lg hover:bg-[var(--surface-2)] transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>

          <div className="bg-[var(--surface-2)] rounded-xl p-6 shadow-inner shadow-[var(--border)]/40">
            <div className="prose prose-sm max-w-none">
              {summary.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4 last:mb-0 text-[var(--text-2)] leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 text-blue-600 hover:text-blue-700 font-medium"
            >
              Summarize Another PDF
            </button>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <FileText className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">Summarization Failed</h3>
            <p className="text-red-500 mt-2">{error}</p>
            <p className="text-[var(--text-3)] mt-4 text-sm">
              Make sure you have set up your Gemini API key in the environment variables.
            </p>
          </div>
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Try Again
          </button>
        </div>
      )}
      <AiConsentDialog
        isOpen={showConsent}
        onAccept={() => {
          setAiConsentGiven(true);
          setShowConsent(false);
          if (file) handleSummarize(file);
        }}
        onDecline={() => setShowConsent(false)}
        toolName="AI Summarizer"
      />
    </ToolLayout>
  );
}