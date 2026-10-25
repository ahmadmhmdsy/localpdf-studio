import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Home from '../pages/Home';
import { ToastProvider } from '../contexts/ToastContext';
import ToastContainer from '../components/ui/ToastContainer';
import { useToolsStore } from '../store/toolsStore';

const { showToastMock } = vi.hoisted(() => ({ showToastMock: vi.fn() }));

vi.mock('../contexts/ToastContext', async () => {
  const actual = await vi.importActual('../contexts/ToastContext');
  return {
    ...actual,
    useToast: () => ({
      showToast: showToastMock,
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
    showToastMock.mockReset();
    window.history.pushState({}, '', '/');
    useToolsStore.setState({ skin: 'glass', locale: 'en' });
  });

  describe('Header', () => {
    it('displays main heading', () => {
      renderHome();
      expect(screen.getByRole('heading', { name: /every tool you need to work with PDFs/i })).toBeInTheDocument();
    });

    it('displays a subtitle that states the browser-local and containment boundary', () => {
      renderHome();
      expect(screen.getByText(/Most tools process in your browser/i)).toBeInTheDocument();
      expect(
        screen.getByText(/AI and camera tools are unavailable in the public beta/i),
      ).toBeInTheDocument();
      expect(screen.queryByText(/100% FREE/i)).not.toBeInTheDocument();
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
        'PDF to JPG', 'PDF to PDF/A-style', 'PDF to WORD', 'PDF to EXCEL', 'PDF to POWERPOINT',
        'Rotate PDF', 'Add page numbers', 'Add watermark', 'Crop PDF', 'Edit PDF',
        'Sign PDF', 'Blackout PDF', 'Compare PDF', 'Decrypt PDF', 'Protect PDF',
        'AI Summarizer', 'Translate PDF',
      ];
      toolNames.forEach(name => {
        expect(screen.getByText(name)).toBeInTheDocument();
      });
    });

    it('renders catalog names and categories in Arabic when that locale is active', () => {
      useToolsStore.setState({ locale: 'ar' });
      renderHome();

      expect(screen.getByText('دمج PDF')).toBeInTheDocument();
      // The category heading and the tool share the same Arabic name.
      expect(screen.getAllByText('تنظيم PDF').length).toBeGreaterThan(0);
      expect(screen.queryByText('Merge PDF')).not.toBeInTheDocument();
    });

    it('renders tool descriptions', () => {
      renderHome();
      expect(screen.getByText(/combine PDFs in the order/i)).toBeInTheDocument();
      expect(screen.getByText(/reduce file size/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Not available in the web build/i).length).toBeGreaterThan(0);
    });

    it('uses theme-specific WCAG AA foregrounds for availability badges', () => {
      renderHome();

      for (const badge of screen.getAllByLabelText('Limited')) {
        expect(badge).toHaveClass('text-amber-800', 'dark:text-amber-300');
      }
      for (const badge of screen.getAllByLabelText('Unavailable')) {
        expect(badge).toHaveClass('text-red-700', 'dark:text-red-300');
      }
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
      const link = screen.getByRole('link', { name: /remove pages delete/i });
      expect(link).toHaveAttribute('href', '/editor?tool=remove-pages');
    });

    it('links Edit PDF to /editor?tool=edit-pdf', () => {
      renderHome();
      const link = screen.getByRole('link', { name: /edit PDF add text/i });
      expect(link).toHaveAttribute('href', '/editor?tool=edit-pdf');
    });

    it('links Sign PDF to /editor?tool=sign-pdf', () => {
      renderHome();
      const link = screen.getByRole('link', { name: /sign PDF draw/i });
      expect(link).toHaveAttribute('href', '/editor?tool=sign-pdf');
    });

    it('keeps blackout on its disabled dedicated route, not the editor redaction query', () => {
      renderHome();
      const blackout = screen.getByRole('link', { name: /blackout pdf/i });

      expect(blackout).toHaveAttribute('href', '/tools/blackout-pdf');
      expect(blackout).toHaveAttribute('aria-disabled', 'true');
      expect(
        screen.getAllByRole('link').some((link) => link.getAttribute('href')?.includes('redact-pdf')),
      ).toBe(false);
    });

    it('keeps unavailable status text outside the dimmed card subtree', () => {
      renderHome();
      const unavailableLink = screen.getByRole('link', {
        name: (accessibleName) =>
          /compress pdf/i.test(accessibleName) && /unavailable/i.test(accessibleName),
      });
      const unavailableBadge = within(unavailableLink).getByLabelText('Unavailable');

      expect(unavailableBadge.closest('.opacity-60')).toBeNull();
    });

    it('keeps unavailable tool links non-navigating and explains why', async () => {
      renderHome();
      const link = screen.getByRole('link', {
        name: (accessibleName) =>
          /compress pdf/i.test(accessibleName) && /unavailable/i.test(accessibleName),
      });

      expect(link).toHaveAttribute('aria-disabled', 'true');
      await user.click(link);

      expect(window.location.pathname).toBe('/');
      expect(showToastMock).toHaveBeenCalledWith({
        message: 'This tool is unavailable while known defects are being remedied.',
        type: 'warning',
        duration: 3000,
      });
    });
  });
});