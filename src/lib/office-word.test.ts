import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track the jsPDF instance so tests can assert against the recorded calls.
const { mockJsPdfInstance } = vi.hoisted(() => {
  const instance = {
    internal: { pageSize: { getWidth: () => 595, getHeight: () => 842 } },
    setFontSize: vi.fn(),
    addPage: vi.fn(),
    text: vi.fn(),
    splitTextToSize: vi.fn((line: string) => [line]),
    output: vi.fn(() => new ArrayBuffer(0)),
  };
  return { mockJsPdfInstance: instance };
});

vi.mock('jspdf', () => {
  // Use a class so vitest's import shape check (`new jsPDF(...)`) is happy.
  class JsPDF {
    internal = mockJsPdfInstance.internal;
    setFontSize = mockJsPdfInstance.setFontSize;
    addPage = mockJsPdfInstance.addPage;
    text = mockJsPdfInstance.text;
    splitTextToSize = mockJsPdfInstance.splitTextToSize;
    output = mockJsPdfInstance.output;
  }
  return { __esModule: true, jsPDF: JsPDF, default: JsPDF };
});

// Mock mammoth to return canned HTML.
const { mockConvertToHtml } = vi.hoisted(() => ({
  mockConvertToHtml: vi.fn(),
}));

vi.mock('mammoth', () => ({
  convertToHtml: mockConvertToHtml,
  __esModule: true,
}));

import { convertWordToPdf } from './office-word';

describe('convertWordToPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the shared instance's behavior between tests.
    mockJsPdfInstance.addPage.mockClear();
    mockJsPdfInstance.text.mockClear();
    mockJsPdfInstance.splitTextToSize.mockClear();
    mockJsPdfInstance.output.mockClear();
    mockJsPdfInstance.setFontSize.mockClear();
    mockJsPdfInstance.splitTextToSize.mockImplementation((line: string) => [line]);
    mockJsPdfInstance.output.mockReturnValue(new ArrayBuffer(0));
  });

  it('extracts HTML via mammoth and writes one line per text line', async () => {
    mockConvertToHtml.mockResolvedValueOnce({ value: '<h1>Hello</h1><p>World</p>' });
    const file = new File([new Uint8Array()], 'doc.docx');

    await convertWordToPdf(file);

    expect(mockConvertToHtml).toHaveBeenCalledWith({ arrayBuffer: expect.any(ArrayBuffer) });
    // "Hello" and "World" become two text() calls.
    expect(mockJsPdfInstance.text).toHaveBeenCalledTimes(2);
  });

  it('strips HTML tags before splitting lines', async () => {
    mockConvertToHtml.mockResolvedValueOnce({
      value: '<p>One</p><p>Two</p><p>Three</p>',
    });
    const file = new File([new Uint8Array()], 'doc.docx');

    await convertWordToPdf(file);

    expect(mockJsPdfInstance.text).toHaveBeenCalledTimes(3);
  });

  it('calls addPage() when text would overflow past the page bottom', async () => {
    // Use many input lines and a tiny page so addPage() is forced.
    const lines = Array.from({ length: 200 }, (_, i) => `<p>line ${i}</p>`).join('');
    mockConvertToHtml.mockResolvedValueOnce({ value: lines });
    // The mock page is 595×842; lineHeight=14; with 200 lines it must overflow.
    const file = new File([new Uint8Array()], 'doc.docx');

    await convertWordToPdf(file);

    expect(mockJsPdfInstance.addPage).toHaveBeenCalled();
  });

  it('skips text() for empty lines but still advances the y cursor', async () => {
    mockConvertToHtml.mockResolvedValueOnce({ value: '<p>One</p><p></p><p>Two</p>' });
    const file = new File([new Uint8Array()], 'doc.docx');

    await convertWordToPdf(file);

    // Two non-empty lines → two text() calls; the empty line does not draw.
    expect(mockJsPdfInstance.text).toHaveBeenCalledTimes(2);
  });

  it('returns the jsPDF output', async () => {
    mockConvertToHtml.mockResolvedValueOnce({ value: '<p>Hi</p>' });
    const buffer = new ArrayBuffer(8);
    mockJsPdfInstance.output.mockReturnValueOnce(buffer);

    const file = new File([new Uint8Array()], 'doc.docx');
    const result = await convertWordToPdf(file);

    // The lib casts `output('arraybuffer')` to Uint8Array in the return
    // statement; jsdom's ArrayBuffer is fine to assert the call was made.
    expect(mockJsPdfInstance.output).toHaveBeenCalledWith('arraybuffer');
    expect(result).toBeDefined();
  });

  it('configures the jsPDF document as A4 portrait at 11pt', async () => {
    mockConvertToHtml.mockResolvedValueOnce({ value: '<p>x</p>' });
    const file = new File([new Uint8Array()], 'doc.docx');

    await convertWordToPdf(file);

    expect(mockJsPdfInstance.setFontSize).toHaveBeenCalledWith(11);
  });
});
