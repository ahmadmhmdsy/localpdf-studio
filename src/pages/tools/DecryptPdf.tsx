import React, { useState } from 'react';
import { KeyRound, FileCheck, Eye } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { unlockPdf } from '../../lib/encryption';
import { saveAs } from 'file-saver';
import { useI18n } from '../../i18n/useI18n';

type Step = 'upload' | 'password' | 'processing' | 'done' | 'error';

export default function DecryptPdf() {
  const { t, toolName } = useI18n();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      setFile(files[0]);
      setStep('password');
      setError(null);
    }
  };

  const handleDecrypt = async () => {
    if (!file || !password.trim()) return;

    setStep('processing');
    setError(null);

    try {
      const result = await unlockPdf(file, password);
      setResultData(result);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tool.decrypt.failedFallback'));
      setStep('error');
    }
  };

  const handleDownload = () => {
    if (resultData && file) {
      const blob = new Blob([resultData], { type: 'application/pdf' });
      const newName = file.name.replace(/\.pdf$/i, '_decrypted.pdf');
      saveAs(blob, newName);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPassword('');
    setResultData(null);
    setError(null);
  };

  return (
    <ToolLayout title={toolName('decrypt-pdf')} description={t('tool.decrypt.description')}>
      {step === 'upload' && (
        <FileUploadZone

          ariaLabel={t('tool.decrypt.uploadAria')} onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title={t('tool.decrypt.uploadTitle')}
          subtitle={t('tool.common.dropPdfFile')}
        />
      )}

      {step === 'password' && file && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="flex items-center gap-3 bg-blue-50 px-6 py-4 rounded-xl">
            <FileCheck className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-medium text-[var(--text)]">{file.name}</p>
              <p className="text-sm text-[var(--text-3)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          <div className="w-full max-w-md">
            <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
              {t('tool.decrypt.passwordLabel')}
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('tool.decrypt.passwordPlaceholder')}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleDecrypt()}
              />
              <Eye className="absolute end-3 top-3.5 w-5 h-5 text-[var(--text-3)]" />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="px-6 py-3 text-[var(--text-2)] hover:text-[var(--text)] font-medium"
            >
              {t('tool.common.cancel')}
            </button>
            <button
              onClick={handleDecrypt}
              disabled={!password.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <KeyRound className="w-5 h-5" />
              {t('tool.decrypt.submit')}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState
          title={t('tool.decrypt.processingTitle')}
          description={t('tool.decrypt.processingDescription')}
        />
      )}

      {(step === 'done' || step === 'error') && (
        <div className="flex flex-col items-center gap-6 py-12">
          {step === 'done' ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <KeyRound className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.decrypt.successTitle')}</h3>
                <p className="text-[var(--text-3)] mt-2">{t('tool.decrypt.successDescription')}</p>
              </div>
              <button
                onClick={handleDownload}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                {t('tool.decrypt.download')}
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <KeyRound className="w-10 h-10 text-red-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.decrypt.failedTitle')}</h3>
                <p className="text-red-500 mt-2">{error}</p>
              </div>
            </>
          )}
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('tool.decrypt.another')}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
