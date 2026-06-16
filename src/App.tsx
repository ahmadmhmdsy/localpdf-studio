/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import MergePdf from './pages/tools/MergePdf';
import SplitPdf from './pages/tools/SplitPdf';
import PdfToJpg from './pages/tools/PdfToJpg';
import JpgToPdf from './pages/tools/JpgToPdf';
import AddWatermark from './pages/tools/AddWatermark';
import RotatePdf from './pages/tools/RotatePdf';
import RemovePages from './pages/tools/RemovePages';
import ExtractPages from './pages/tools/ExtractPages';
import AddPageNumbers from './pages/tools/AddPageNumbers';
import OrganizePdf from './pages/tools/OrganizePdf';
import ScanToPdf from './pages/tools/ScanToPdf';
import CompressPdf from './pages/tools/CompressPdf';
import HtmlToPdf from './pages/tools/HtmlToPdf';
import CropPdf from './pages/tools/CropPdf';
import EditPdf from './pages/tools/EditPdf';
import SignPdf from './pages/tools/SignPdf';
import BlackoutPdf from './pages/tools/BlackoutPdf';
import ComparePdf from './pages/tools/ComparePdf';
import DecryptPdf from './pages/tools/DecryptPdf';
import ProtectPdf from './pages/tools/ProtectPdf';
import RepairPdf from './pages/tools/RepairPdf';
import AiSummarizer from './pages/tools/AiSummarizer';
import PdfToPdfA from './pages/tools/PdfToPdfA';
import WordToPdf from './pages/tools/WordToPdf';
import PdfToWord from './pages/tools/PdfToWord';
import OcrPdf from './pages/tools/OcrPdf';
import ExcelToPdf from './pages/tools/ExcelToPdf';
import PdfToExcel from './pages/tools/PdfToExcel';
import PowerpointToPdf from './pages/tools/PowerpointToPdf';
import PdfToPowerpoint from './pages/tools/PdfToPowerpoint';
import TranslatePdf from './pages/tools/TranslatePdf';
import Editor from './pages/Editor';
import { EditorProvider } from './contexts/EditorContext';
import { ToastProvider } from './contexts/ToastContext';
import ToastContainer from './components/ui/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';
import ToolErrorBoundary from './components/ToolErrorBoundary';
import OnboardingTour from './components/onboarding/OnboardingTour';

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
        </ErrorBoundary>
      </BrowserRouter>
    </EditorProvider>
    </ToastProvider>
  );
}
