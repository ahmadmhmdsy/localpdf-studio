import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { File as FileIcon, X, GripVertical, Plus, ArrowLeft } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import StepTrack from '../../components/tools/StepTrack';
import { mergePdfs } from '../../lib/pdf';
import { logError } from '../../lib/logger';
import { useDropzone } from 'react-dropzone';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { PDF_ACCEPT } from '../../types/dropzone';

type Step = 'upload' | 'configure' | 'processing' | 'download';

const STEPS = ['Upload', 'Configure', 'Download'];

export default function MergePdf() {
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const { showToast } = useToast();

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setStep('configure');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFiles(items);
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    if (newFiles.length === 0) {
      setStep('upload');
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      showToast({ message: 'Please select at least 2 PDF files to merge.', type: 'warning' });
      return;
    }

    setStep('processing');
    try {
      const mergedPdfBytes = await mergePdfs(files);
      
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setStep('download');
    } catch (error) {
      logError('Error merging PDFs:', error);
      showToast({
        message: 'An error occurred while merging the PDFs. Please try again.',
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    }
  };

  const startOver = () => {
    setFiles([]);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('upload');
  };

  // Add more files dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => handleFilesSelected(acceptedFiles),
    accept: PDF_ACCEPT
  });

  const getStepIndex = () => {
    switch (step) {
      case 'upload': return 0;
      case 'configure': return 1;
      case 'processing': return 1;
      case 'download': return 2;
      default: return 0;
    }
  };

  return (
    <ToolLayout
      title="Merge PDF"
      description="Combine PDFs in the order you want with the easiest PDF merger available."
    >
      <StepTrack steps={STEPS} currentStep={getStepIndex()} />

      {step === 'upload' && (
        <FileUploadZone
          ariaLabel="Select PDF files" onFilesSelected={handleFilesSelected}
          title="Select PDF files"
          subtitle="or drop PDFs here"
        />
      )}

      {step === 'configure' && (
        <div className="w-full max-w-4xl">
          <div className="bg-[var(--surface)] rounded-[var(--radius-xl)] border border-[var(--border)] p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--text)]">Drag and drop to reorder files</h3>
              <div
                {...getRootProps()}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border-2 border-dashed cursor-pointer transition-colors",
                  isDragActive ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text-2)]"
                )}
              >
                <input {...getInputProps()} />
                <Plus size={18} />
                <span className="text-sm font-medium">Add more files</span>
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="pdf-list" direction="vertical">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex flex-col gap-3"
                  >
                    {files.map((file, index) => {
                      const draggableId = `${file.name}-${index}`;
                      return (
                        <Draggable draggableId={draggableId} index={index} key={draggableId}>
                          {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "group flex items-center justify-between p-4 rounded-[var(--radius-lg)] border bg-[var(--surface)] transition-all duration-200",
                              snapshot.isDragging ? "shadow-lg border-[var(--accent)] z-50 scale-[1.02]" : "border-[var(--border)] hover:border-[var(--border-hover,var(--accent))]"
                            )}
                          >
                            <div className="flex items-center gap-4 overflow-hidden">
                              <div {...provided.dragHandleProps} aria-label="Drag to reorder" className="text-[var(--text-3)] hover:text-[var(--accent)] cursor-grab active:cursor-grabbing transition-colors">
                                <GripVertical size={20} />
                              </div>
                              <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                                <FileIcon size={20} className="text-[var(--accent)]" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="font-medium text-[var(--text)] truncate">{file.name}</span>
                                <span className="text-xs text-[var(--text-3)]">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="p-2 text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-[var(--accent-dim)] rounded-[var(--radius-sm)] transition-all duration-200 opacity-0 group-hover:opacity-100"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X size={20} />
                            </button>
                          </div>
                        )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={startOver}
              className="flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface)] border border-[var(--border)] transition-colors"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              onClick={handleMerge}
              disabled={files.length < 2}
              className="bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-10 rounded-[var(--radius-xl)] text-lg transition-all shadow-lg shadow-[var(--accent)]/25"
            >
              Merge PDFs
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title="Merging PDFs..." 
          description="Please wait while we combine your documents. This is happening locally in your browser."
        />
      )}

      {step === 'download' && resultUrl && (
        <DownloadState 
          title="PDFs merged successfully!"
          description="Your documents have been combined into a single PDF file."
          fileName="merged_document.pdf"
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}
