import { TextAnnotation, ImageAnnotation, RedactAnnotation, CropAnnotation, DrawAnnotation } from '../../contexts/EditorContext';
import { useDocumentStore, useAnnotationsStore, useToolsStore } from '../../store';
import { useToast } from '../../contexts/ToastContext';
import { Moon, Sun, Trash2 } from 'lucide-react';
import { PDFDocument, PDFPage, PDFFont, degrees, rgb, StandardFonts } from 'pdf-lib';
import { useState, useRef } from 'react';
import { hexToRgb } from '../../lib/color';
import SignatureModal from './SignatureModal';
import ConfirmModal from '../ui/ConfirmModal';
import { ToolPicker } from './toolbar/ToolPicker';
import { HistoryControls } from './toolbar/HistoryControls';
import { ZoomControls } from './toolbar/ZoomControls';
import { ExportButtons } from './toolbar/ExportButtons';

export default function Toolbar() {
  const { zoom, setZoom, activeTool, setActiveTool, currentPage, darkMode, toggleDarkMode } = useToolsStore();
  const { file, clearFile, pdfLibDoc, pages, setPages } = useDocumentStore();
  const { annotations, addAnnotation, undo, redo } = useAnnotationsStore();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [showRedactConfirm, setShowRedactConfirm] = useState(false);
  const doExportRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl && pages[currentPage - 1]) {
        addAnnotation({
          id: `image-${Date.now()}`,
          pageId: pages[currentPage - 1].id,
          type: 'image',
          dataUrl,
          x: 0.5,
          y: 0.5,
          width: 0.2,
          height: 0.2,
        }, pages);
        setActiveTool('select');
      }
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSignatureSave = (dataUrl: string) => {
    if (pages[currentPage - 1]) {
      addAnnotation({
        id: `signature-${Date.now()}`,
        pageId: pages[currentPage - 1].id,
        type: 'image',
        dataUrl,
        x: 0.5,
        y: 0.5,
        width: 0.2,
        height: 0.1,
      }, pages);
      setActiveTool('select');
    }
  };

  const renderAnnotations = async (newPdf: PDFDocument, copiedPages: PDFPage[], pageMetas: typeof pages, helveticaFont: PDFFont) => {
    for (let index = 0; index < copiedPages.length; index++) {
      const page = copiedPages[index];
      const pageMeta = pageMetas[index];
      const pageAnnotations = annotations.filter(a => a.pageId === pageMeta.id);
      const { width, height } = page.getSize();

      for (const ann of pageAnnotations) {
        if (ann.type === 'text') {
          const textAnn = ann as TextAnnotation;
          const { r, g, b } = hexToRgb(textAnn.color);
          const textWidth = helveticaFont.widthOfTextAtSize(textAnn.text, textAnn.fontSize);
          const textHeight = helveticaFont.heightAtSize(textAnn.fontSize);
          const x = (textAnn.x * width) - (textWidth / 2);
          const y = height - (textAnn.y * height) - (textHeight / 2);
          page.drawText(textAnn.text, {
            x, y, size: textAnn.fontSize, font: helveticaFont,
            color: rgb(r, g, b), opacity: textAnn.opacity ?? 1, rotate: degrees(-(textAnn.rotation || 0)),
          });
        } else if (ann.type === 'image') {
          const imgAnn = ann as ImageAnnotation;
          let image;
          if (imgAnn.dataUrl.startsWith('data:image/png')) image = await newPdf.embedPng(imgAnn.dataUrl);
          else if (imgAnn.dataUrl.startsWith('data:image/jpeg')) image = await newPdf.embedJpg(imgAnn.dataUrl);
          if (image) {
            const imgWidth = imgAnn.width * width;
            const imgHeight = imgAnn.height * height;
            page.drawImage(image, {
              x: (imgAnn.x * width) - (imgWidth / 2), y: height - (imgAnn.y * height) - (imgHeight / 2),
              width: imgWidth, height: imgHeight, opacity: imgAnn.opacity ?? 1, rotate: degrees(-(imgAnn.rotation || 0)),
            });
          }
        } else if (ann.type === 'redact') {
          const redactAnn = ann as RedactAnnotation;
          const { r, g, b } = hexToRgb(redactAnn.color);
          const rectWidth = redactAnn.width * width;
          const rectHeight = redactAnn.height * height;
          page.drawRectangle({
            x: (redactAnn.x * width) - (rectWidth / 2), y: height - (redactAnn.y * height) - (rectHeight / 2),
            width: rectWidth, height: rectHeight, color: rgb(r, g, b),
          });
        } else if (ann.type === 'crop') {
          const cropAnn = ann as CropAnnotation;
          const cropWidth = cropAnn.width * width;
          const cropHeight = cropAnn.height * height;
          page.setCropBox(
            (cropAnn.x * width) - (cropWidth / 2), height - (cropAnn.y * height) - (cropHeight / 2),
            cropWidth, cropHeight,
          );
        } else if (ann.type === 'draw') {
          const drawAnn = ann as DrawAnnotation;
          if (drawAnn.points.length < 2) continue;
          const { r, g, b } = hexToRgb(drawAnn.color);
          let pathStr = '';
          for (let i = 0; i < drawAnn.points.length; i++) {
            const p = drawAnn.points[i];
            const px = p.x * width;
            const py = height - (p.y * height);
            pathStr += i === 0 ? `M ${px} ${py} ` : `L ${px} ${py} `;
          }
          page.drawSvgPath(pathStr, {
            borderColor: rgb(r, g, b), borderWidth: drawAnn.strokeWidth, borderOpacity: drawAnn.opacity ?? 1,
          });
        }
      }
    }
  };

  const doExport = async () => {
    if (!pdfLibDoc || !file || pages.length === 0) return;
    setIsExporting(true);
    try {
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdfLibDoc, pages.map(p => p.originalIndex));
      const helveticaFont = await newPdf.embedFont(StandardFonts.Helvetica);

      for (let index = 0; index < copiedPages.length; index++) {
        const page = copiedPages[index];
        const pageMeta = pages[index];
        const currentRotation = page.getRotation().angle;
        const addedRotation = pageMeta.rotation;
        page.setRotation(degrees(currentRotation + addedRotation));
        newPdf.addPage(page);
      }

      await renderAnnotations(newPdf, copiedPages, pages, helveticaFont);

      const pdfBytes = await newPdf.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error exporting PDF:", error);
      showToast({ message: "Failed to export PDF. Please try again.", type: 'error', duration: 5000 });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    if (!pdfLibDoc || !file || pages.length === 0) return;
    const hasRedactions = annotations.some(a => a.type === 'redact');
    if (hasRedactions) {
      doExportRef.current = doExport;
      setShowRedactConfirm(true);
      return;
    }
    await doExport();
  };

  const handleExportCurrentPage = async () => {
    if (!pdfLibDoc || !file || pages.length === 0) return;
    setIsExporting(true);
    try {
      const newPdf = await PDFDocument.create();
      const pageMeta = pages[currentPage - 1];
      const [copiedPage] = await newPdf.copyPages(pdfLibDoc, [pageMeta.originalIndex]);
      const helveticaFont = await newPdf.embedFont(StandardFonts.Helvetica);
      const currentRotation = copiedPage.getRotation().angle;
      const addedRotation = pageMeta.rotation;
      copiedPage.setRotation(degrees(currentRotation + addedRotation));
      newPdf.addPage(copiedPage);

      await renderAnnotations(newPdf, [copiedPage], [pageMeta], helveticaFont);

      const pdfBytes = await newPdf.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `page_${currentPage}_${file.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error exporting current page:", error);
      showToast({ message: "Failed to export current page. Please try again.", type: 'error', duration: 5000 });
    } finally {
      setIsExporting(false);
    }
  };

  if (!file) return null;

  return (
    <div className="h-14 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between px-4 shadow-sm z-10">
      <div className="flex items-center gap-4">
        <ToolPicker
          activeTool={activeTool}
          onSelect={setActiveTool}
          onOpenSignature={() => setIsSignatureModalOpen(true)}
          onPickImage={() => fileInputRef.current?.click()}
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
        <ZoomControls
          zoom={zoom}
          onZoomIn={() => setZoom(zoom + 0.25)}
          onZoomOut={() => setZoom(zoom - 0.25)}
          onFit={() => setZoom(1)}
        />
        <HistoryControls
          onUndo={() => { const result = undo(pages); if (result) setPages(result.pages); }}
          onRedo={() => { const result = redo(pages); if (result) setPages(result.pages); }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-md transition-colors ${darkMode ? 'bg-[var(--surface)] text-yellow-400' : 'text-[var(--text-2)] hover:bg-[var(--surface-2)]'}`}
          title={darkMode ? "Light Mode" : "Dark Mode"}
          aria-label={darkMode ? "Light Mode" : "Dark Mode"}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="w-px h-6 bg-[var(--surface-2)] mx-1"></div>
        <span className="text-sm font-medium text-[var(--text-3)] truncate max-w-[200px]" title={file.name}>
          {file.name}
        </span>
        <button
          onClick={clearFile}
          className="p-2 text-[var(--text-3)] hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Close File"
          aria-label="Close File"
        >
          <Trash2 size={18} />
        </button>
        <div className="w-px h-6 bg-[var(--surface-2)] mx-1"></div>
        <ExportButtons
          isExporting={isExporting}
          disabled={pages.length === 0}
          onExportCurrentPage={handleExportCurrentPage}
          onExportAll={handleExport}
        />
      </div>

      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSignatureSave}
      />
      <ConfirmModal
        isOpen={showRedactConfirm}
        title="Redaction warning"
        message={`You have marked redaction shapes in the editor. These are visible shapes only — they are NOT removed from the underlying PDF. For true redaction (removing text from the content stream), use the "Blackout PDF" tool from the home page.\n\nContinue with this visual-only export?`}
        confirmLabel="Continue export"
        variant="warning"
        onConfirm={() => {
          setShowRedactConfirm(false);
          const fn = doExportRef.current;
          doExportRef.current = undefined;
          if (fn) void fn();
        }}
        onCancel={() => setShowRedactConfirm(false)}
      />
    </div>
  );
}