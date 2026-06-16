import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Home from '../pages/Home';
import { ToastProvider } from '../contexts/ToastContext';
import ToastContainer from '../components/ui/ToastContainer';

vi.mock('../contexts/ToastContext', async () => {
  const actual = await vi.importActual('../contexts/ToastContext');
  return {
    ...actual,
    useToast: () => ({
      showToast: vi.fn(),
      toasts: [],
      dismissToast: vi.fn(),
    }),
  };
});

function renderHome() {
  return render(
    <ToastProvider>
      <BrowserRouter>
        <ToastContainer />
        <Home />
      </BrowserRouter>
    </ToastProvider>
  );
}

describe('Home', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Header', () => {
    it('displays main heading', () => {
      renderHome();
      expect(screen.getByRole('heading', { name: /every tool you need to work with PDFs/i })).toBeInTheDocument();
    });

    it('displays subtitle about free and local processing', () => {
      renderHome();
      expect(screen.getByText(/100% FREE/i)).toBeInTheDocument();
      expect(screen.getByText(/process locally in your browser/i)).toBeInTheDocument();
    });
  });

  describe('Category Headings', () => {
    it('displays ORGANIZE PDF heading', () => {
      renderHome();
      expect(screen.getByText('ORGANIZE PDF')).toBeInTheDocument();
    });

    it('displays OPTIMIZE PDF heading', () => {
      renderHome();
      expect(screen.getByText('OPTIMIZE PDF')).toBeInTheDocument();
    });

    it('displays CONVERT TO PDF heading', () => {
      renderHome();
      expect(screen.getByText('CONVERT TO PDF')).toBeInTheDocument();
    });

    it('displays CONVERT FROM PDF heading', () => {
      renderHome();
      expect(screen.getByText('CONVERT FROM PDF')).toBeInTheDocument();
    });

    it('displays EDIT PDF heading', () => {
      renderHome();
      expect(screen.getByText('EDIT PDF')).toBeInTheDocument();
    });

    it('displays PDF SECURITY heading', () => {
      renderHome();
      expect(screen.getByText('PDF SECURITY')).toBeInTheDocument();
    });

    it('displays PDF INTELLIGENCE heading', () => {
      renderHome();
      expect(screen.getByText('PDF INTELLIGENCE')).toBeInTheDocument();
    });
  });

  describe('Tool Cards', () => {
    it('renders all 31 tool cards', () => {
      renderHome();
      const toolNames = [
        'Merge PDF', 'Split PDF', 'Remove pages', 'Extract pages', 'Organize PDF', 'Scan to PDF',
        'Compress PDF', 'Repair PDF', 'OCR PDF',
        'JPG to PDF', 'HTML to PDF', 'WORD to PDF', 'EXCEL to PDF', 'POWERPOINT to PDF',
        'PDF to JPG', 'PDF to PDF/A', 'PDF to WORD', 'PDF to EXCEL', 'PDF to POWERPOINT',
        'Rotate PDF', 'Add page numbers', 'Add watermark', 'Crop PDF', 'Edit PDF',
        'Sign PDF', 'Blackout PDF', 'Compare PDF', 'Decrypt PDF', 'Protect PDF',
        'AI Summarizer', 'Translate PDF',
      ];
      toolNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it('renders tool descriptions', () => {
      renderHome();
      expect(screen.getByText(/combine PDFs in the order/i)).toBeInTheDocument();
      expect(screen.getByText(/reduce file size/i)).toBeInTheDocument();
      expect(screen.getByText(/get AI-generated summary/i)).toBeInTheDocument();
    });
  });

  describe('Links', () => {
    it('links Merge PDF to /tools/merge-pdf', () => {
      renderHome();
      const link = screen.getByRole('link', { name: /merge PDF combine PDFs/i });
      expect(link).toHaveAttribute('href', '/tools/merge-pdf');
    });

    it('links Remove pages to /editor?tool=remove-pages', () => {
      renderHome();
      const link = screen.getByRole('link', { name: /remove pages remove pages from/i });
      expect(link).toHaveAttribute('href', '/editor?tool=remove-pages');
    });

    it('links Edit PDF to /editor?tool=edit-pdf', () => {
      renderHome();
      const link = screen.getByRole('link', { name: /edit PDF add text/i });
      expect(link).toHaveAttribute('href', '/editor?tool=edit-pdf');
    });

    it('links Sign PDF to /editor?tool=sign-pdf', () => {
      renderHome();
      const link = screen.getByRole('link', { name: /sign PDF sign yourself/i });
      expect(link).toHaveAttribute('href', '/editor?tool=sign-pdf');
    });
  });
});
