import React, { useState } from 'react';
import { Lock, FileCheck, Eye, EyeOff, Shield } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { protectPdf, PdfPermissions } from '../../lib/encryption';
import { saveAs } from 'file-saver';
import { useI18n } from '../../i18n/useI18n';

type Step = 'upload' | 'password' | 'permissions' | 'processing' | 'done' | 'error';

export default function ProtectPdf() {
  const { t, toolName } = useI18n();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<PdfPermissions>({
    printing: true,
    copying: true,
    annotating: true,
    modifying: false,
  });
  const [resultData, setResultData] = useState<Uint8Array | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 1) {
      setFile(files[0]);
      setStep('password');
      setError(null);
    }
  };

  const handleNextToPermissions = () => {
    if (userPassword.length < 4) {
      setError(t('tool.protect.passwordTooShort'));
      return;
    }
    if (userPassword !== confirmPassword) {
      setError(t('tool.protect.passwordMismatch'));
      return;
    }
    setError(null);
    setStep('permissions');
  };

  const handleProtect = async () => {
    if (!file || !userPassword) return;

    setStep('processing');
    setError(null);

    try {
      const result = await protectPdf(file, userPassword, userPassword, permissions);
      setResultData(result);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('tool.protect.failedFallback'));
      setStep('error');
    }
  };

  const handleDownload = () => {
    if (resultData && file) {
      const blob = new Blob([resultData], { type: 'application/pdf' });
      const newName = file.name.replace(/\.pdf$/i, '_protected.pdf');
      saveAs(blob, newName);
    }
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setUserPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setPermissions({
      printing: true,
      copying: true,
      annotating: true,
      modifying: false,
    });
    setResultData(null);
    setError(null);
  };

  const togglePermission = (key: keyof PdfPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <ToolLayout title={toolName('protect-pdf')} description={t('tool.protect.description')}>
      {step === 'upload' && (
        <FileUploadZone
          
          ariaLabel={t('tool.common.selectPdfFile')} onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title={t('tool.protect.uploadTitle')}
          subtitle={t('tool.common.dropPdfFile')}
        />
      )}

      {step === 'password' && file && (
        <div className="flex flex-col items-center gap-6 py-8 max-w-md mx-auto">
          <div className="flex items-center gap-3 bg-blue-50 px-6 py-4 rounded-xl w-full">
            <FileCheck className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-medium text-[var(--text)]">{file.name}</p>
              <p className="text-sm text-[var(--text-3)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                {t('tool.protect.setPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder={t('tool.protect.passwordPlaceholder')}
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={t(showPassword ? 'tool.protect.hidePassword' : 'tool.protect.showPassword')}
                  className="absolute end-3 top-3.5 text-[var(--text-3)] hover:text-[var(--text-2)]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                {t('tool.protect.confirmPassword')}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('tool.protect.confirmPlaceholder')}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 w-full">
            <button
              onClick={reset}
              className="flex-1 px-6 py-3 text-[var(--text-2)] hover:text-[var(--text)] font-medium border border-[var(--border)] rounded-xl hover:bg-[var(--surface-2)]"
            >
              {t('tool.common.cancel')}
            </button>
            <button
              onClick={handleNextToPermissions}
              disabled={!userPassword.trim() || !confirmPassword.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {t('tool.protect.next')}
            </button>
          </div>
        </div>
      )}

      {step === 'permissions' && (
        <div className="flex flex-col items-center gap-6 py-8 max-w-md mx-auto">
          <div className="flex items-center gap-3 bg-blue-50 px-6 py-4 rounded-xl w-full">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-medium text-[var(--text)]">{t('tool.protect.permissionsTitle')}</p>
              <p className="text-sm text-[var(--text-3)]">{t('tool.protect.permissionsDescription')}</p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <label className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-xl cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
              <div>
                <p className="font-medium text-[var(--text)]">{t('tool.protect.printing')}</p>
                <p className="text-sm text-[var(--text-3)]">{t('tool.protect.printingHint')}</p>
              </div>
              <input
                type="checkbox"
                checked={permissions.printing}
                onChange={() => togglePermission('printing')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-xl cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
              <div>
                <p className="font-medium text-[var(--text)]">{t('tool.protect.copying')}</p>
                <p className="text-sm text-[var(--text-3)]">{t('tool.protect.copyingHint')}</p>
              </div>
              <input
                type="checkbox"
                checked={permissions.copying}
                onChange={() => togglePermission('copying')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-xl cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
              <div>
                <p className="font-medium text-[var(--text)]">{t('tool.protect.annotating')}</p>
                <p className="text-sm text-[var(--text-3)]">{t('tool.protect.annotatingHint')}</p>
              </div>
              <input
                type="checkbox"
                checked={permissions.annotating}
                onChange={() => togglePermission('annotating')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-xl cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
              <div>
                <p className="font-medium text-[var(--text)]">{t('tool.protect.modifying')}</p>
                <p className="text-sm text-[var(--text-3)]">{t('tool.protect.modifyingHint')}</p>
              </div>
              <input
                type="checkbox"
                checked={permissions.modifying}
                onChange={() => togglePermission('modifying')}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => setStep('password')}
              className="flex-1 px-6 py-3 text-[var(--text-2)] hover:text-[var(--text)] font-medium border border-[var(--border)] rounded-xl hover:bg-[var(--surface-2)]"
            >
              {t('tool.common.back')}
            </button>
            <button
              onClick={handleProtect}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              <Lock className="w-5 h-5" />
              {t('tool.protect.submit')}
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState
          title={t('tool.protect.processingTitle')}
          description={t('tool.protect.processingDescription')}
        />
      )}

      {(step === 'done' || step === 'error') && (
        <div className="flex flex-col items-center gap-6 py-12">
          {step === 'done' ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Lock className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.protect.successTitle')}</h3>
                <p className="text-[var(--text-3)] mt-2">{t('tool.protect.successDescription')}</p>
              </div>
              <button
                onClick={handleDownload}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                {t('tool.protect.download')}
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <Lock className="w-10 h-10 text-red-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[var(--text)]">{t('tool.protect.failedTitle')}</h3>
                <p className="text-red-500 mt-2">{error}</p>
              </div>
            </>
          )}
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('tool.protect.another')}
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
