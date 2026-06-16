import FileUploadZone from '../../components/tools/FileUploadZone';

interface EditorEmptyStateProps {
  isLoading: boolean;
  onFilesSelected: (files: File[]) => void;
}

export function EditorEmptyState({ isLoading, onFilesSelected }: EditorEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-4xl font-bold text-[var(--text)] tracking-tight">
          Visual PDF Workspace
        </h1>
        <p className="text-xl text-[var(--text-2)] max-w-xl mx-auto">
          Upload a document to start editing, annotating, and organizing your PDF visually.
        </p>
        {isLoading ? (
          <div className="bg-[var(--surface)] rounded-[var(--radius-xl)] border border-[var(--border)] shadow-sm p-12 flex flex-col items-center justify-center space-y-4">
            {window.matchMedia('(prefers-reduced-motion: reduce)').matches ? (
              <div className="w-12 h-12 border-4 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full opacity-50"></div>
            ) : (
              <div className="w-12 h-12 border-4 border-[var(--accent)]/20 border-t-[var(--accent)] rounded-full animate-spin"></div>
            )}
            <p className="text-[var(--text-2)] font-medium">Loading document...</p>
          </div>
        ) : (
          <FileUploadZone
            ariaLabel="Select PDF file"
            onFilesSelected={onFilesSelected}
            title="Select PDF file"
            subtitle="or drop PDF here"
            maxFiles={1}
          />
        )}
      </div>
    </div>
  );
}
