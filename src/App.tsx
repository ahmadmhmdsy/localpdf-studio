/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Editor from './pages/Editor';
import { EditorProvider } from './contexts/EditorContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ui/ToastContainer';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import ToolErrorBoundary from './components/ToolErrorBoundary';
import OnboardingTour from './components/onboarding/OnboardingTour';

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

function ToolRoute({ element, name }: { element: React.ReactNode; name: string }) {
  return (
    <ToolErrorBoundary toolName={name}>
      {element}
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
            <Route path="tools/merge-pdf" element={<ToolRoute element={<MergePdf />} name="Merge PDF" />} />
            <Route path="tools/split-pdf" element={<ToolRoute element={<SplitPdf />} name="Split PDF" />} />
            <Route path="tools/pdf-to-jpg" element={<ToolRoute element={<PdfToJpg />} name="PDF to JPG" />} />
            <Route path="tools/jpg-to-pdf" element={<ToolRoute element={<JpgToPdf />} name="JPG to PDF" />} />
            <Route path="tools/add-watermark" element={<ToolRoute element={<AddWatermark />} name="Add Watermark" />} />
            <Route path="tools/rotate-pdf" element={<ToolRoute element={<RotatePdf />} name="Rotate PDF" />} />
            <Route path="tools/remove-pages" element={<ToolRoute element={<RemovePages />} name="Remove Pages" />} />
            <Route path="tools/extract-pages" element={<ToolRoute element={<ExtractPages />} name="Extract Pages" />} />
            <Route path="tools/add-page-numbers" element={<ToolRoute element={<AddPageNumbers />} name="Add Page Numbers" />} />
            <Route path="tools/organize-pdf" element={<ToolRoute element={<OrganizePdf />} name="Organize PDF" />} />
            <Route path="tools/scan-to-pdf" element={<ToolRoute element={<ScanToPdf />} name="Scan to PDF" />} />
            <Route path="tools/compress-pdf" element={<ToolRoute element={<CompressPdf />} name="Compress PDF" />} />
            <Route path="tools/html-to-pdf" element={<ToolRoute element={<HtmlToPdf />} name="HTML to PDF" />} />
            <Route path="tools/crop-pdf" element={<ToolRoute element={<CropPdf />} name="Crop PDF" />} />
            <Route path="tools/edit-pdf" element={<ToolRoute element={<EditPdf />} name="Edit PDF" />} />
            <Route path="tools/sign-pdf" element={<ToolRoute element={<SignPdf />} name="Sign PDF" />} />
            <Route path="tools/blackout-pdf" element={<ToolRoute element={<BlackoutPdf />} name="Blackout PDF" />} />
            {/* Backward-compat alias: removed in next major release */}
            <Route path="tools/redact-pdf" element={<Navigate to="/tools/blackout-pdf" replace />} />
            <Route path="tools/compare-pdf" element={<ToolRoute element={<ComparePdf />} name="Compare PDF" />} />
            <Route path="tools/decrypt-pdf" element={<ToolRoute element={<DecryptPdf />} name="Decrypt PDF" />} />
            {/* Backward-compat alias: removed in next major release */}
            <Route path="tools/unlock-pdf" element={<Navigate to="/tools/decrypt-pdf" replace />} />
            <Route path="tools/protect-pdf" element={<ToolRoute element={<ProtectPdf />} name="Protect PDF" />} />
            <Route path="tools/repair-pdf" element={<ToolRoute element={<RepairPdf />} name="Repair PDF" />} />
            <Route path="tools/ai-summarizer" element={<ToolRoute element={<AiSummarizer />} name="AI Summarizer" />} />
            <Route path="tools/pdf-to-pdfa" element={<ToolRoute element={<PdfToPdfA />} name="PDF to PDF/A" />} />
            <Route path="tools/word-to-pdf" element={<ToolRoute element={<WordToPdf />} name="Word to PDF" />} />
            <Route path="tools/pdf-to-word" element={<ToolRoute element={<PdfToWord />} name="PDF to Word" />} />
            <Route path="tools/ocr-pdf" element={<ToolRoute element={<OcrPdf />} name="OCR PDF" />} />
            <Route path="tools/excel-to-pdf" element={<ToolRoute element={<ExcelToPdf />} name="Excel to PDF" />} />
            <Route path="tools/pdf-to-excel" element={<ToolRoute element={<PdfToExcel />} name="PDF to Excel" />} />
            <Route path="tools/powerpoint-to-pdf" element={<ToolRoute element={<PowerpointToPdf />} name="PowerPoint to PDF" />} />
            <Route path="tools/pdf-to-powerpoint" element={<ToolRoute element={<PdfToPowerpoint />} name="PDF to PowerPoint" />} />
            <Route path="tools/translate-pdf" element={<ToolRoute element={<TranslatePdf />} name="Translate PDF" />} />
          </Route>
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </EditorProvider>
    </ToastProvider>
  );
}