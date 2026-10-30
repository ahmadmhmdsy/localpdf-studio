import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useToolsStore } from '../../store/toolsStore';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TranslatePdf from './TranslatePdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/ai', () => ({
  translatePdf: vi.fn(async (file: File, targetLang: string) => {
    return {
      translatedText: 'Translated content',
      targetLanguage: targetLang,
    };
  }),
  SUPPORTED_LANGUAGES: [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
  ],
}));

describe('TranslatePdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    useToolsStore.setState({ locale: 'en' });
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<TranslatePdf />);
    expect(screen.getByText(/select a PDF to translate/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<TranslatePdf />);
    expect(screen.getByRole('heading', { name: /translate PDF/i })).toBeInTheDocument();
  });

  it('transitions to language selection after file upload', async () => {
    renderWithProviders(<TranslatePdf />);
    
    const pdfFile = await generateDummyPdf(3, 'document.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByText(/select target language/i)).toBeInTheDocument();
    });
  });

  it('provides target language options', async () => {
    renderWithProviders(<TranslatePdf />);
    
    const pdfFile = await generateDummyPdf(3, 'document.pdf');
    const input = screen.getByLabelText(/select PDF file/i);
    
    await user.upload(input, pdfFile);
    
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('renders the page in Arabic when that locale is active', () => {
    useToolsStore.setState({ locale: 'ar' });
    renderWithProviders(<TranslatePdf />);
    expect(screen.getByText('اختر ملف PDF لترجمته')).toBeInTheDocument();
  });
});
