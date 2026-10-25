import { useState } from 'react';
import { CheckCircle, AlertCircle, Download } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { repairPdf, type RepairIssue, type RepairResult } from '../../lib/repair';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';
import { saveAs } from 'file-saver';
import { useI18n } from '../../i18n/useI18n';
import type { MessageKey } from '../../i18n';

type Step = 'upload' | 'processing' | 'done' | 'error';

const ISSUE_KEYS: Record<RepairIssue['code'], MessageKey> = {
  'structure-validated': 'tool.repair.issue.structureValidated',
  'title-added': 'tool.repair.issue.titleAdded',
  'author-added': 'tool.repair.issue.authorAdded',
  'page-size-fixed': 'tool.repair.issue.pageSizeFixed',
};

export default function RepairPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<RepairResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { t, toolName, toolDescription } = useI18n();

  const issueText = (issue: RepairIssue): string =>
    issue.code === 'page-size-fixed'
      ? t(ISSUE_KEYS[issue.code], { page: issue.page })
      : t(ISSUE_KEYS[issue.code]);

  const failWith = (message: string) => {
    setError(message);
    showToast({ message, type: 'error', duration: 5000 });
    setStep('error');
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      setFile(files[0]);
      handleRepair(files[0]);
    }
  };

  const handleRepair = async (selectedFile: File) => {
    setStep('processing');
    setError(null);
    setResult(null);

    try {
      const repairResult = await repairPdf(selectedFile);

      // A repair either produces a real document or reports the failure; there
      // is no placeholder file to download (roadmap A7.9).
      if (repairResult.success && repairResult.data) {
        setResult(repairResult);
        setStep('done');
      } else {
        failWith(t('tool.repair.tooDamaged'));
      }
    } catch (err) {
      logError('Error repairing PDF:', err);
      failWith(err instanceof Error ? err.message : t('tool.repair.error'));
    }
  };

  const handleDownload = () => {
    if (result?.data && file) {
      const blob = new Blob([result.data], { type: 'application/pdf' });
      const newName = file.name.replace(/\.pdf$/i, '_repaired.pdf');
      saveAs(blob, newName);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <ToolLayout title={toolName('repair-pdf')} description={toolDescription('repair-pdf')}>
      {step === 'upload' && (
        <FileUploadZone
          ariaLabel={t('tool.common.selectPdfFile')}
          onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title={t('tool.repair.uploadTitle')}
          subtitle={t('tool.repair.uploadSubtitle')}
        />
      )}

      {step === 'processing' && (
        <ProcessingState
          title={t('tool.repair.processingTitle')}
          description={t('tool.repair.processingDescription')}
        />
      )}

      {step === 'done' && result?.data && (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-green-100">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.repair.successTitle')}</h3>
            <p className="mt-2 text-[var(--text-3)]">
              {t('tool.repair.successSummary', { count: result.issuesFixed.length })}
            </p>
          </div>

          {result.issuesFixed.length > 0 && (
            <div className="w-full max-w-lg bg-[var(--surface-2)] rounded-xl p-4 shadow-inner shadow-[var(--border)]/40">
              <h4 className="font-medium text-[var(--text)] mb-3">{t('tool.repair.issuesHeading')}</h4>
              <ul className="space-y-2">
                {result.issuesFixed.map((issue, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-[var(--text-2)]">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {issueText(issue)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            {t('tool.repair.download')}
          </button>

          <button onClick={reset} className="text-blue-600 hover:text-blue-700 font-medium">
            {t('tool.repair.again')}
          </button>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-6 py-12" role="alert">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.repair.failedTitle')}</h3>
            <p className="text-red-500 mt-2">{error}</p>
            <p className="text-[var(--text-3)] mt-4 text-sm">{t('tool.repair.failedHint')}</p>
          </div>
          <button onClick={reset} className="text-blue-600 hover:text-blue-700 font-medium">
            {t('tool.common.tryAgain')}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
