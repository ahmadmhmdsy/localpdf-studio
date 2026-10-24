import { describe, it, expect, vi } from 'vitest';

const { mockAsync, mockZipInstance, mockDrawText, mockAddPage, mockSave } = vi.hoisted(() => ({
  mockAsync: vi.fn(),
  mockZipInstance: { file: vi.fn() },
  mockDrawText: vi.fn(),
  mockAddPage: vi.fn(),
  mockSave: vi.fn(),
}));

vi.mock('jszip', () => ({
  __esModule: true,
  default: { loadAsync: vi.fn(async () => mockZipInstance) },
}));

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn(async () => ({
      addPage: mockAddPage,
      embedFont: vi.fn(async () => ({})),
      save: mockSave,
    })),
  },
  rgb: vi.fn((r: number, g: number, b: number) => ({ red: r, green: g, blue: b })),
  StandardFonts: { Helvetica: 'Helvetica', HelveticaBold: 'HelveticaBold' },
}));

vi.mock('./pdfjs', () => ({ pdfjsLib: { getDocument: vi.fn() } }));

import { convertPowerpointToPdf } from './office-pptx';

const SLIDE1_XML = `
<p:sp>
  <p:nvSpPr><p:cNvPr name="Title"/></p:nvSpPr>
  <p:txBody>
    <a:p><a:r><a:t>Hello, World!</a:t></a:r></a:p>
  </p:txBody>
</p:sp>
`;

describe('convertPowerpointToPdf', () => {
  it('returns the saved PDF as a Uint8Array', async () => {
    mockAsync.mockResolvedValue(SLIDE1_XML);
    mockZipInstance.file.mockImplementation((name: string) =>
      name === 'ppt/slides/slide1.xml' ? { async: mockAsync } : null,
    );
    mockAddPage.mockImplementation(() => ({ drawText: mockDrawText }));
    mockSave.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const file = new File([new Uint8Array([1])], 'deck.pptx');
    const result = await convertPowerpointToPdf(file);
    expect(result).toBeInstanceOf(Uint8Array);
    expect(mockSave).toHaveBeenCalled();
  });

  it('throws if the archive contains no slide XML files', async () => {
    mockZipInstance.file.mockReturnValue(null);
    mockAddPage.mockImplementation(() => ({ drawText: mockDrawText }));
    const file = new File([new Uint8Array([1])], 'deck.pptx');
    await expect(convertPowerpointToPdf(file)).rejects.toThrow(/no slides/i);
  });

  it('draws the title text onto each slide', async () => {
    mockAsync.mockResolvedValue(SLIDE1_XML);
    mockZipInstance.file.mockImplementation((name: string) =>
      name === 'ppt/slides/slide1.xml' ? { async: mockAsync } : null,
    );
    mockAddPage.mockImplementation(() => ({ drawText: mockDrawText }));
    mockSave.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const file = new File([new Uint8Array([1])], 'deck.pptx');
    await convertPowerpointToPdf(file);
    const drawnTexts = mockDrawText.mock.calls.map((c) => c[0]);
    expect(drawnTexts).toContain('Hello, World!');
  });

  it('adds one PDF page per slide found in the archive', async () => {
    mockAddPage.mockClear();
    let asyncCallIdx = 0;
    const SLIDE2_XML = '<p:sp><a:t>Slide 2</a:t></p:sp>';
    mockAsync.mockImplementation(async () => {
      asyncCallIdx += 1;
      return asyncCallIdx === 1 ? SLIDE1_XML : SLIDE2_XML;
    });
    const present = new Set(['ppt/slides/slide1.xml', 'ppt/slides/slide2.xml']);
    mockZipInstance.file.mockImplementation((name: string) =>
      present.has(name) ? { async: mockAsync } : null,
    );
    mockAddPage.mockImplementation(() => ({ drawText: mockDrawText }));
    mockSave.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const file = new File([new Uint8Array([1])], 'deck.pptx');
    await convertPowerpointToPdf(file);
    expect(mockAddPage).toHaveBeenCalledTimes(2);
  });

  it('falls back to a direct text extraction when no <p:sp> shapes are found', async () => {
    mockAsync.mockResolvedValue('<a:t>orphan text</a:t>');
    mockZipInstance.file.mockImplementation((name: string) =>
      name === 'ppt/slides/slide1.xml' ? { async: mockAsync } : null,
    );
    mockAddPage.mockImplementation(() => ({ drawText: mockDrawText }));
    mockSave.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const file = new File([new Uint8Array([1])], 'deck.pptx');
    await convertPowerpointToPdf(file);
    const drawnTexts = mockDrawText.mock.calls.map((c) => c[0]);
    expect(drawnTexts).toContain('orphan text');
  });

  it('truncates drawn text to 200 characters per element', async () => {
    const long = 'A'.repeat(500);
    mockAsync.mockResolvedValue(`<p:sp><a:t>${long}</a:t></p:sp>`);
    mockZipInstance.file.mockImplementation((name: string) =>
      name === 'ppt/slides/slide1.xml' ? { async: mockAsync } : null,
    );
    mockAddPage.mockImplementation(() => ({ drawText: mockDrawText }));
    mockSave.mockResolvedValue(new Uint8Array([1, 2, 3]));
    const file = new File([new Uint8Array([1])], 'deck.pptx');
    await convertPowerpointToPdf(file);
    const longDrawn = mockDrawText.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].startsWith('A'),
    )?.[0];
    expect(typeof longDrawn).toBe('string');
    expect((longDrawn as string).length).toBe(200);
  });
});