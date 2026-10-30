import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import KeyboardShortcutsHelp from '../components/editor/KeyboardShortcutsHelp';
import SignatureModal from '../components/editor/SignatureModal';
import { ToolPicker } from '../components/editor/toolbar/ToolPicker';
import { ZoomControls } from '../components/editor/toolbar/ZoomControls';
import { useToolsStore } from '../store/toolsStore';

describe('editor chrome in Arabic', () => {
  afterEach(() => {
    useToolsStore.setState({ locale: 'en' });
  });

  it('renders the shortcuts dialog', () => {
    useToolsStore.setState({ locale: 'ar' });
    render(<KeyboardShortcutsHelp isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'اختصارات لوحة المفاتيح' })).toBeInTheDocument();
    expect(screen.getByText('حذف التعليق المحدد')).toBeInTheDocument();
  });

  it('renders the signature dialog', () => {
    useToolsStore.setState({ locale: 'ar' });
    render(<SignatureModal isOpen onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'إنشاء توقيع' })).toBeInTheDocument();
  });

  it('names the toolbar buttons', () => {
    useToolsStore.setState({ locale: 'ar' });
    render(
      <>
        <ToolPicker activeTool={null} onSelect={vi.fn()} onOpenSignature={vi.fn()} onPickImage={vi.fn()} />
        <ZoomControls zoom={1} onZoomIn={vi.fn()} onZoomOut={vi.fn()} onFit={vi.fn()} />
      </>,
    );
    expect(screen.getByRole('button', { name: 'إضافة نص' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ملاءمة الصفحة' })).toBeInTheDocument();
  });
});
