import React, { useState } from 'react';
import { File as FileIcon, X, GitCompare, ChevronLeft, ChevronRight } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import { getPdfPageThumbnails } from '../../lib/image';
import { logError } from '../../lib/logger';
import { useToast } from '../../contexts/ToastContext';

type Step = 'upload' | 'loading_thumbnails' | 'compare';

export default function ComparePdf() {
  const [step, setStep] = useState<Step>('upload');
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [thumbnails1, setThumbnails1] = useState<string[]>([]);
  const [thumbnails2, setThumbnails2] = useState<string[]>([]);
  const [currentPage1, setCurrentPage1] = useState<number>(0);
  const [currentPage2, setCurrentPage2] = useState<number>(0);
  const [syncScroll, setSyncScroll] = useState(true);
  const { showToast } = useToast();

  const handleFilesSelected = async (newFiles: File[]) => {
    if (newFiles.length === 2) {
      setFile1(newFiles[0]);
      setFile2(newFiles[1]);
      setStep('loading_thumbnails');
      
      try {
        const [thumbs1, thumbs2] = await Promise.all([
          getPdfPageThumbnails(newFiles[0]),
          getPdfPageThumbnails(newFiles[1])
        ]);
        
        if (thumbs1.length > 0 && thumbs2.length > 0) {
          setThumbnails1(thumbs1);
          setThumbnails2(thumbs2);
          setStep('compare');
        } else {
          throw new Error("No pages found in one or both files");
        }
      } catch (error) {
        logError("Error loading thumbnails:", error);
        showToast({
          message: "Failed to load PDF previews. Please try other files.",
          type: 'error',
          duration: 5000,
        });
        setStep('upload');
      }
    } else {
      showToast({ message: "Please select exactly 2 PDF files to compare.", type: 'warning' });
    }
  };

  const startOver = () => {
    setFile1(null);
    setFile2(null);
    setThumbnails1([]);
    setThumbnails2([]);
    setCurrentPage1(0);
    setCurrentPage2(0);
    setStep('upload');
  };

  const handlePageChange1 = (newPage: number) => {
    setCurrentPage1(newPage);
    if (syncScroll && newPage < thumbnails2.length) {
      setCurrentPage2(newPage);
    }
  };

  const handlePageChange2 = (newPage: number) => {
    setCurrentPage2(newPage);
    if (syncScroll && newPage < thumbnails1.length) {
      setCurrentPage1(newPage);
    }
  };

  return (
    <ToolLayout 
      title="Compare PDF" 
      description="Show a side-by-side document comparison and easily spot changes."
    >
      {step === 'upload' && (
        <FileUploadZone 
          
          ariaLabel="Select PDF files" onFilesSelected={handleFilesSelected} 
          title="Select 2 PDF files"
          subtitle="or drop PDFs here"
          maxFiles={2}
        />
      )}

      {step === 'loading_thumbnails' && (
        <ProcessingState 
          title="Loading pages..." 
          description="Please wait while we generate previews of your documents."
        />
      )}

      {step === 'compare' && file1 && file2 && (
        <div className="w-full max-w-7xl flex flex-col gap-6">
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <GitCompare size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Side-by-Side Comparison</h3>
                <p className="text-xs text-gray-500">Comparing {file1.name} and {file2.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={syncScroll}
                  onChange={(e) => setSyncScroll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Sync Pages</span>
              </label>
              
              <button 
                onClick={startOver}
                className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
              >
                <X size={16} />
                Close Comparison
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 h-[70vh]">
            {/* Document 1 */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={file1.name}>
                  {file1.name}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handlePageChange1(Math.max(0, currentPage1 - 1))}
                    disabled={currentPage1 === 0}
                    className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300 transition-colors"
                    aria-label="Previous page document 1"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs font-medium text-gray-500 w-16 text-center">
                    {currentPage1 + 1} / {thumbnails1.length}
                  </span>
                  <button 
                    onClick={() => handlePageChange1(Math.min(thumbnails1.length - 1, currentPage1 + 1))}
                    disabled={currentPage1 === thumbnails1.length - 1}
                    className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300 transition-colors"
                    aria-label="Next page document 1"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-gray-100 flex justify-center">
                <img 
                  src={thumbnails1[currentPage1]} 
                  alt={`Doc 1 Page ${currentPage1 + 1}`} 
                  className="max-w-full h-auto object-contain shadow-md bg-white"
                />
              </div>
            </div>

            {/* Document 2 */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={file2.name}>
                  {file2.name}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handlePageChange2(Math.max(0, currentPage2 - 1))}
                    disabled={currentPage2 === 0}
                    className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300 transition-colors"
                    aria-label="Previous page document 2"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-xs font-medium text-gray-500 w-16 text-center">
                    {currentPage2 + 1} / {thumbnails2.length}
                  </span>
                  <button 
                    onClick={() => handlePageChange2(Math.min(thumbnails2.length - 1, currentPage2 + 1))}
                    disabled={currentPage2 === thumbnails2.length - 1}
                    className="p-1 text-gray-600 hover:text-blue-600 disabled:text-gray-300 transition-colors"
                    aria-label="Next page document 2"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-gray-100 flex justify-center">
                <img 
                  src={thumbnails2[currentPage2]} 
                  alt={`Doc 2 Page ${currentPage2 + 1}`} 
                  className="max-w-full h-auto object-contain shadow-md bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
