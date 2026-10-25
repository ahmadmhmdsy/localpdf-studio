import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { AlertTriangle, Image as ImageIcon, X, GripVertical, Plus } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { convertImagesToPdf, type ImageFit, type ImagePageSize } from '../../lib/image';
import { DEFAULT_FIT, DEFAULT_IMAGE_DPI, DEFAULT_PAGE_SIZE } from '../../constants/jpgToPdf';
import { logError } from '../../lib/logger';
import { useDropzone } from 'react-dropzone';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { IMAGE_ACCEPT } from '../../types/dropzone';

type Step = 'upload' | 'configure' | 'processing' | 'download';

const PAGE_SIZE_OPTIONS: { value: ImagePageSize; label: string }[] = [
  { value: 'image', label: 'Image size' },
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
];

const FIT_OPTIONS: { value: ImageFit; label: string }[] = [
  { value: 'contain', label: 'Contain - keep the whole image, add margins' },
  { value: 'fill', label: 'Fill - stretch the image to the page' },
];

export default function JpgToPdf() {
  const [step, setStep] = useState<Step>('upload');
  const [files, setFiles] = useState<File[]>([]);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<string>('');
  const [pageSize, setPageSize] = useState<ImagePageSize>(DEFAULT_PAGE_SIZE);
  const [fit, setFit] = useState<ImageFit>(DEFAULT_FIT);
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);
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

  const handleConvert = async () => {
    if (files.length === 0) return;

    setStep('processing');
    try {
      const { bytes, skipped } = await convertImagesToPdf(files, { pageSize, fit });
      setSkippedFiles(skipped);
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setStep('download');
    } catch (error) {
      logError('Error converting JPGs to PDF:', error);
      showToast({
        message:
          error instanceof Error && error.message
            ? error.message
            : 'An error occurred while converting. Please try again.',
        type: 'error',
        duration: 5000,
      });
      setStep('configure');
    }
  };

  const startOver = () => {
    setFiles([]);
    setSkippedFiles([]);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setStep('upload');
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => handleFilesSelected(acceptedFiles),
    accept: IMAGE_ACCEPT
  });

  return (
    <ToolLayout 
      title="JPG to PDF" 
      description="Turn JPG images into a PDF with one image per page."
    >
      {step === 'upload' && (
        <FileUploadZone

          ariaLabel="Select JPG images" onFilesSelected={handleFilesSelected}
          title="Select JPG images"
          subtitle="or drop JPG images here"
          accept={IMAGE_ACCEPT}
        />
      )}

      {step === 'configure' && (
        <div className="w-full max-w-4xl">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-[var(--text)]">Drag and drop to reorder images</h3>
              <div 
                {...getRootProps()} 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                  isDragActive ? "border-yellow-500 bg-yellow-50 text-yellow-600" : "border-[var(--border)] hover:border-yellow-400 hover:text-yellow-600 text-[var(--text-2)]"
                )}
              >
                <input {...getInputProps()} />
                <Plus size={18} />
                <span className="text-sm font-medium">Add more images</span>
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="image-list" direction="vertical">
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
                              "flex items-center justify-between p-4 rounded-xl border bg-[var(--surface)] transition-shadow",
                              snapshot.isDragging ? "shadow-lg border-yellow-300 z-50" : "border-[var(--border)] hover:border-[var(--border)]"
                            )}
                          >
                            <div className="flex items-center gap-4 overflow-hidden">
                              <div {...provided.dragHandleProps} className="text-[var(--text-3)] hover:text-[var(--text-2)] cursor-grab active:cursor-grabbing">
                                <GripVertical size={20} />
                              </div>
                              <div className="w-10 h-10 rounded bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                <ImageIcon size={20} className="text-yellow-600" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="font-medium text-[var(--text)] truncate">{file.name}</span>
                                <span className="text-xs text-[var(--text-3)]">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => removeFile(index)}
                              className="p-2 text-[var(--text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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

          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-[var(--text)] mb-4">Page layout</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="page-size" className="block text-sm font-medium text-[var(--text-2)] mb-2">
                  Page size
                </label>
                <select
                  id="page-size"
                  value={pageSize}
                  onChange={(event) => setPageSize(event.target.value as ImagePageSize)}
                  className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {pageSize !== 'image' && (
                <div>
                  <label htmlFor="image-fit" className="block text-sm font-medium text-[var(--text-2)] mb-2">
                    Image fit
                  </label>
                  <select
                    id="image-fit"
                    value={fit}
                    onChange={(event) => setFit(event.target.value as ImageFit)}
                    className="w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                  >
                    {FIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <p className="text-sm text-[var(--text-3)] mt-3">
              Image size keeps every page at the image&apos;s own dimensions, using the DPI stored in
              the image ({DEFAULT_IMAGE_DPI} DPI when none is stored). A4 and Letter place every
              image on the same standard page.
            </p>
          </div>

          <div className="flex justify-center">
            <button 
              onClick={handleConvert}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-4 px-12 rounded-xl text-xl transition-colors shadow-lg"
            >
              Convert to PDF
            </button>
          </div>
        </div>
      )}

      {step === 'processing' && (
        <ProcessingState 
          title="Converting to PDF..." 
          description="Please wait while we embed your images into a PDF document. This is happening locally in your browser."
        />
      )}

      {step === 'download' && resultUrl && (
        <div className="w-full max-w-[680px]">
          <DownloadState 
            title="PDF created successfully!"
            description="Your images have been combined into a single PDF file."
            fileName="images.pdf"
            fileUrl={resultUrl}
            fileSize={resultSize}
            onStartOver={startOver}
          />
          {skippedFiles.length > 0 && (
            <div role="status" className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="mt-0.5 flex-shrink-0 text-yellow-600" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold text-yellow-800">Some images were skipped</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    These files could not be read as JPEG or PNG images, so they are not in the PDF:{' '}
                    {skippedFiles.join(', ')}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
