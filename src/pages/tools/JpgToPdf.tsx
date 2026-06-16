import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Image as ImageIcon, X, GripVertical, Plus } from 'lucide-react';
import ToolLayout from '../../components/tools/ToolLayout';
import FileUploadZone from '../../components/tools/FileUploadZone';
import ProcessingState from '../../components/tools/ProcessingState';
import DownloadState from '../../components/tools/DownloadState';
import { jpgsToPdf } from '../../lib/image';
import { logError } from '../../lib/logger';
import { useDropzone } from 'react-dropzone';
import { cn } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';
import { IMAGE_ACCEPT } from '../../types/dropzone';

type Step = 'upload' | 'configure' | 'processing' | 'download';

export default function JpgToPdf() {
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

  const handleConvert = async () => {
    if (files.length === 0) return;

    setStep('processing');
    try {
      const pdfBytes = await jpgsToPdf(files);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setResultUrl(url);
      setResultSize((blob.size / 1024 / 1024).toFixed(2) + ' MB');
      setStep('download');
    } catch (error) {
      logError('Error converting JPGs to PDF:', error);
      showToast({
        message: 'An error occurred while converting. Please try again.',
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => handleFilesSelected(acceptedFiles),
    accept: IMAGE_ACCEPT
  });

  return (
    <ToolLayout 
      title="JPG to PDF" 
      description="Convert JPG images to PDF in seconds. Easily adjust orientation and margins."
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Drag and drop to reorder images</h3>
              <div 
                {...getRootProps()} 
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                  isDragActive ? "border-yellow-500 bg-yellow-50 text-yellow-600" : "border-gray-300 hover:border-yellow-400 hover:text-yellow-600 text-gray-600"
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
                              "flex items-center justify-between p-4 rounded-xl border bg-white transition-shadow",
                              snapshot.isDragging ? "shadow-lg border-yellow-300 z-50" : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <div className="flex items-center gap-4 overflow-hidden">
                              <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                                <GripVertical size={20} />
                              </div>
                              <div className="w-10 h-10 rounded bg-yellow-100 flex items-center justify-center flex-shrink-0">
                                <ImageIcon size={20} className="text-yellow-600" />
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="font-medium text-gray-900 truncate">{file.name}</span>
                                <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => removeFile(index)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
        <DownloadState 
          title="PDF created successfully!"
          description="Your images have been combined into a single PDF file."
          fileName="images.pdf"
          fileUrl={resultUrl}
          fileSize={resultSize}
          onStartOver={startOver}
        />
      )}
    </ToolLayout>
  );
}
