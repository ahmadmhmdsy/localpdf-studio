/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Editor from './pages/Editor';
import { EditorProvider } from './contexts/EditorContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ui/ToastContainer';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import ToolErrorBoundary from './components/ToolErrorBoundary';
import OnboardingTour from './components/onboarding/OnboardingTour';
import ToolAvailabilityGate from './components/tools/ToolAvailabilityGate';
import type { ToolId } from './config/featureRegistry';

const MergePdf = lazy(() => import('./pages/tools/MergePdf'));
const SplitPdf = lazy(() => import('./pages/tools/SplitPdf'));
const PdfToJpg = lazy(() => import('./pages/tools/PdfToJpg'));
const JpgToPdf = lazy(() => import('./pages/tools/JpgToPdf'));
const AddWatermark = lazy(() => import('./pages/tools/AddWatermark'));
const RotatePdf = lazy(() => import('./pages/tools/RotatePdf'));
const RemovePages = lazy(() => import('./pages/tools/RemovePages'));
const ExtractPages = lazy(() => import('./pages/tools/ExtractPages'));
const AddPageNumbers = lazy(() => import('./pages/tools/AddPageNumbers'));
const OrganizePdf = lazy(() => import('./pages/tools/OrganizePdf'));
const ScanToPdf = lazy(() => import('./pages/tools/ScanToPdf'));
const CompressPdf = lazy(() => import('./pages/tools/CompressPdf'));
const HtmlToPdf = lazy(() => import('./pages/tools/HtmlToPdf'));
const CropPdf = lazy(() => import('./pages/tools/CropPdf'));
const EditPdf = lazy(() => import('./pages/tools/EditPdf'));
const SignPdf = lazy(() => import('./pages/tools/SignPdf'));
const BlackoutPdf = lazy(() => import('./pages/tools/BlackoutPdf'));
const ComparePdf = lazy(() => import('./pages/tools/ComparePdf'));
const DecryptPdf = lazy(() => import('./pages/tools/DecryptPdf'));
const ProtectPdf = lazy(() => import('./pages/tools/ProtectPdf'));
const RepairPdf = lazy(() => import('./pages/tools/RepairPdf'));
const AiSummarizer = lazy(() => import('./pages/tools/AiSummarizer'));
const PdfToPdfA = lazy(() => import('./pages/tools/PdfToPdfA'));
const WordToPdf = lazy(() => import('./pages/tools/WordToPdf'));
const PdfToWord = lazy(() => import('./pages/tools/PdfToWord'));
const OcrPdf = lazy(() => import('./pages/tools/OcrPdf'));
const ExcelToPdf = lazy(() => import('./pages/tools/ExcelToPdf'));
const PdfToExcel = lazy(() => import('./pages/tools/PdfToExcel'));
const PowerpointToPdf = lazy(() => import('./pages/tools/PowerpointToPdf'));
const PdfToPowerpoint = lazy(() => import('./pages/tools/PdfToPowerpoint'));
const TranslatePdf = lazy(() => import('./pages/tools/TranslatePdf'));

function ToolRoute({ element, name, toolId }: { element: React.ReactNode; name: string; toolId: ToolId }) {
  return (
    <ToolErrorBoundary toolName={name}>
      <ToolAvailabilityGate toolId={toolId} toolName={name}>
        {element}
      </ToolAvailabilityGate>
    </ToolErrorBoundary>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <EditorProvider>
        <ToastContainer />
        <OnboardingTour />
        <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="editor" element={<Editor />} />
            <Route path="tools/merge-pdf" element={<ToolRoute element={<MergePdf />} name="Merge PDF" toolId="merge-pdf" />} />
            <Route path="tools/split-pdf" element={<ToolRoute element={<SplitPdf />} name="Split PDF" toolId="split-pdf" />} />
            <Route path="tools/pdf-to-jpg" element={<ToolRoute element={<PdfToJpg />} name="PDF to JPG" toolId="pdf-to-jpg" />} />
            <Route path="tools/jpg-to-pdf" element={<ToolRoute element={<JpgToPdf />} name="JPG to PDF" toolId="jpg-to-pdf" />} />
            <Route path="tools/add-watermark" element={<ToolRoute element={<AddWatermark />} name="Add Watermark" toolId="add-watermark" />} />
            <Route path="tools/rotate-pdf" element={<ToolRoute element={<RotatePdf />} name="Rotate PDF" toolId="rotate-pdf" />} />
            <Route path="tools/remove-pages" element={<ToolRoute element={<RemovePages />} name="Remove Pages" toolId="remove-pages" />} />
            <Route path="tools/extract-pages" element={<ToolRoute element={<ExtractPages />} name="Extract Pages" toolId="extract-pages" />} />
            <Route path="tools/add-page-numbers" element={<ToolRoute element={<AddPageNumbers />} name="Add Page Numbers" toolId="add-page-numbers" />} />
            <Route path="tools/organize-pdf" element={<ToolRoute element={<OrganizePdf />} name="Organize PDF" toolId="organize-pdf" />} />
            <Route path="tools/scan-to-pdf" element={<ToolRoute element={<ScanToPdf />} name="Scan to PDF" toolId="scan-to-pdf" />} />
            <Route path="tools/compress-pdf" element={<ToolRoute element={<CompressPdf />} name="Compress PDF" toolId="compress-pdf" />} />
            <Route path="tools/html-to-pdf" element={<ToolRoute element={<HtmlToPdf />} name="HTML to PDF" toolId="html-to-pdf" />} />
            <Route path="tools/crop-pdf" element={<ToolRoute element={<CropPdf />} name="Crop PDF" toolId="crop-pdf" />} />
            <Route path="tools/edit-pdf" element={<ToolRoute element={<EditPdf />} name="Edit PDF" toolId="edit-pdf" />} />
            <Route path="tools/sign-pdf" element={<ToolRoute element={<SignPdf />} name="Sign PDF" toolId="sign-pdf" />} />
            <Route path="tools/blackout-pdf" element={<ToolRoute element={<BlackoutPdf />} name="Blackout PDF" toolId="blackout-pdf" />} />
            {/* Backward-compat alias: removed in next major release */}
            <Route path="tools/redact-pdf" element={<Navigate to="/tools/blackout-pdf" replace />} />
            <Route path="tools/compare-pdf" element={<ToolRoute element={<ComparePdf />} name="Compare PDF" toolId="compare-pdf" />} />
            <Route path="tools/decrypt-pdf" element={<ToolRoute element={<DecryptPdf />} name="Decrypt PDF" toolId="decrypt-pdf" />} />
            {/* Backward-compat alias: removed in next major release */}
            <Route path="tools/unlock-pdf" element={<Navigate to="/tools/decrypt-pdf" replace />} />
            <Route path="tools/protect-pdf" element={<ToolRoute element={<ProtectPdf />} name="Protect PDF" toolId="protect-pdf" />} />
            <Route path="tools/repair-pdf" element={<ToolRoute element={<RepairPdf />} name="Repair PDF" toolId="repair-pdf" />} />
            <Route path="tools/ai-summarizer" element={<ToolRoute element={<AiSummarizer />} name="AI Summarizer" toolId="ai-summarizer" />} />
            <Route path="tools/pdf-to-pdfa" element={<ToolRoute element={<PdfToPdfA />} name="PDF to PDF/A" toolId="pdf-to-pdfa" />} />
            <Route path="tools/word-to-pdf" element={<ToolRoute element={<WordToPdf />} name="Word to PDF" toolId="word-to-pdf" />} />
            <Route path="tools/pdf-to-word" element={<ToolRoute element={<PdfToWord />} name="PDF to Word" toolId="pdf-to-word" />} />
            <Route path="tools/ocr-pdf" element={<ToolRoute element={<OcrPdf />} name="OCR PDF" toolId="ocr-pdf" />} />
            <Route path="tools/excel-to-pdf" element={<ToolRoute element={<ExcelToPdf />} name="Excel to PDF" toolId="excel-to-pdf" />} />
            <Route path="tools/pdf-to-excel" element={<ToolRoute element={<PdfToExcel />} name="PDF to Excel" toolId="pdf-to-excel" />} />
            <Route path="tools/powerpoint-to-pdf" element={<ToolRoute element={<PowerpointToPdf />} name="PowerPoint to PDF" toolId="powerpoint-to-pdf" />} />
            <Route path="tools/pdf-to-powerpoint" element={<ToolRoute element={<PdfToPowerpoint />} name="PDF to PowerPoint" toolId="pdf-to-powerpoint" />} />
            <Route path="tools/translate-pdf" element={<ToolRoute element={<TranslatePdf />} name="Translate PDF" toolId="translate-pdf" />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </EditorProvider>
    </ToastProvider>
  );
}