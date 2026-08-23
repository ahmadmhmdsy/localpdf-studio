import React, { useState } from 'react';
import { Lock, FileCheck, Eye, EyeOff, Shield } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { protectPdf, PdfPermissions } from '../../lib/encryption';
import { saveAs } from 'file-saver';

type Step = 'upload' | 'password' | 'permissions' | 'processing' | 'done' | 'error';

export default function ProtectPdf() {
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
      setError('Password must be at least 4 characters');
      return;
    }
    if (userPassword !== confirmPassword) {
      setError('Passwords do not match');
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
      setError(err instanceof Error ? err.message : 'Failed to protect PDF');
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
    <ToolLayout
      title="Protect PDF"
      description="Add password protection and control permissions for your PDF files."
    >
      {step === 'upload' && (
        <FileUploadZone
          
          ariaLabel="Select PDF file" onFilesSelected={handleFilesSelected}
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          title="Select a PDF to protect"
          subtitle="or drop PDF file here"
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
                Set Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Enter password (min 4 characters)"
                  className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-[var(--text-3)] hover:text-[var(--text-2)]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-2)] mb-2">
                Confirm Password *
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
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
              Cancel
            </button>
            <button
              onClick={handleNextToPermissions}
              disabled={!userPassword.trim() || !confirmPassword.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 'permissions' && (
        <div className="flex flex-col items-center gap-6 py-8 max-w-md mx-auto">
          <div className="flex items-center gap-3 bg-blue-50 px-6 py-4 rounded-xl w-full">
            <Shield className="w-8 h-8 text-blue-600" />
            <div>
              <p className="font-medium text-[var(--text)]">Set Permissions</p>
              <p className="text-sm text-[var(--text-3)]">Control what users can do with the PDF</p>
            </div>
          </div>

          <div className="w-full space-y-3">
            <label className="flex items-center justify-between p-4 bg-[var(--surface-2)] rounded-xl cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
              <div>
                <p className="font-medium text-[var(--text)]">Allow Printing</p>
                <p className="text-sm text-[var(--text-3)]">Users can print the document</p>
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
                <p className="font-medium text-[var(--text)]">Allow Copying</p>
                <p className="text-sm text-[var(--text-3)]">Users can copy text and images</p>
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
                <p className="font-medium text-[var(--text)]">Allow Annotating</p>
                <p className="text-sm text-[var(--text-3)]">Users can add comments and annotations</p>
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
                <p className="font-medium text-[var(--text)]">Allow Modifying</p>
                <p className="text-sm text-[var(--text-3)]">Users can edit the document content</p>
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
              Back
            </button>
            <button
              onClick={handleProtect}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
            >
              <Lock className="w-5 h-5" />
              Protect PDF
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState
          title="Protecting PDF..."
          description="Adding password protection and setting permissions."
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
                <h3 className="text-xl font-semibold text-[var(--text)]">PDF Protected Successfully!</h3>
                <p className="text-[var(--text-3)] mt-2">Your PDF is now password protected.</p>
              </div>
              <button
                onClick={handleDownload}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Download Protected PDF
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <Lock className="w-10 h-10 text-red-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-[var(--text)]">Protection Failed</h3>
                <p className="text-red-500 mt-2">{error}</p>
              </div>
            </>
          )}
          <button
            onClick={reset}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Protect Another PDF
          </button>
        </div>
      )}
    </ToolLayout>
  );
}
