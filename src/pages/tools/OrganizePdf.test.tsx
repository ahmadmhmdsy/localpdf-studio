import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrganizePdf from './OrganizePdf';
import { renderWithProviders } from '../../tests/utils';
import { generateDummyPdf } from '../../tests/fixtures/pdfGenerator';

vi.mock('../../lib/pdf', () => ({
  organizePdf: vi.fn(async (file: File, operations: any) => {
    return new Uint8Array([1, 2, 3, 4, 5]);
  }),
  reorderPdfPages: vi.fn(async () => new Uint8Array([1, 2, 3, 4, 5])),
}));

vi.mock('../../lib/image', () => ({
  getPdfPageThumbnails: vi.fn(async () => ['data:image/jpeg;base64,mock-thumbnail']),
}));

vi.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => children,
  Droppable: ({ children }: { children: (provided: any) => React.ReactNode }) =>
    children({ innerRef: () => {}, droppableProps: {}, placeholder: null }),
  // Draggable's child fn is `(provided, snapshot)` — `snapshot.isDragging`
  // is read in OrganizePdf.tsx:171, so the mock must provide it.
  Draggable: ({
    children,
  }: {
    children: (provided: any, snapshot: any) => React.ReactNode;
  }) =>
    children(
      { innerRef: () => {}, draggableProps: {}, dragHandleProps: {} },
      { isDragging: false },
    ),
}));

describe('OrganizePdf', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  it('renders upload zone on initial load', () => {
    renderWithProviders(<OrganizePdf />);
    expect(screen.getByText(/select PDF file/i)).toBeInTheDocument();
  });

  it('displays tool title', () => {
    renderWithProviders(<OrganizePdf />);
    expect(screen.getByRole('heading', { name: /organize PDF/i })).toBeInTheDocument();
  });

  it('transitions to organize step after file selection', async () => {
    renderWithProviders(<OrganizePdf />);

    const pdfFile = await generateDummyPdf(5, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);

    await user.upload(input, pdfFile);

    // Once the configure step renders, the file name appears in the header.
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('displays page thumbnails in organize view', async () => {
    renderWithProviders(<OrganizePdf />);

    const pdfFile = await generateDummyPdf(5, 'test.pdf');
    const input = screen.getByLabelText(/select PDF file/i);

    await user.upload(input, pdfFile);

    // The mock returns a single thumbnail; the component renders a "Page 1"
    // label below it.
    await waitFor(() => {
      expect(screen.getByText('Page 1')).toBeInTheDocument();
    });
  });
});
