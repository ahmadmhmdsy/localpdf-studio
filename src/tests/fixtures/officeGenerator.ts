/**
 * Generates a minimal DOCX file as a File object
 * Note: This creates a minimal valid DOCX structure
 */
export function generateDummyDocx(
  fileName: string = 'test-document.docx',
  content: string = 'This is a test Word document.'
): File {
  // Minimal DOCX structure as a simple ZIP-like approach
  // In a real implementation, you'd use a library like docx.js or JSZip
  // For testing purposes, we create a minimal structure that can be identified
  
  const docxHeader = Buffer.from([
    0x50, 0x4B, 0x03, 0x04, // ZIP local file header signature
    0x14, 0x00, 0x00, 0x00, // Version, flags
    0x00, 0x00, 0x00, 0x00, // Compression method
    0x00, 0x00, 0x00, 0x00, // CRC, compressed size
    0x00, 0x00, 0x00, 0x00, // Uncompressed size
    0x0B, 0x00, 0x00, 0x00, // File name length
  ]);

  // Create a minimal DOCX structure
  const encoder = new TextEncoder();
  const contentType = '[Content_Types].xml';
  const contentTypes = encoder.encode(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>'
  );

  // Combine into a minimal DOCX
  const fileContent = new Uint8Array(
    docxHeader.length + contentType.length + contentTypes.length + content.length
  );
  
  let offset = 0;
  fileContent.set(docxHeader, offset);
  offset += docxHeader.length;
  fileContent.set(encoder.encode(contentType), offset);
  offset += contentType.length;
  fileContent.set(contentTypes, offset);
  offset += contentTypes.length;
  fileContent.set(encoder.encode(content), offset);

  return new File([fileContent], fileName, { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
  });
}

/**
 * Generates a minimal XLSX file as a File object
 */
export function generateDummyXlsx(
  fileName: string = 'test-spreadsheet.xlsx',
  sheetData: string[][] = [['Name', 'Value'], ['Test', '100']]
): File {
  // Minimal XLSX structure
  const encoder = new TextEncoder();
  
  // Create simple XML content
  const workbookXml = encoder.encode(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></sheets>' +
    '</workbook>'
  );

  // Create sheet XML
  let sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetData>';
  
  sheetData.forEach((row, rowIndex) => {
    sheetXml += `<row r="${rowIndex + 1}">`;
    row.forEach((cell, cellIndex) => {
      const colRef = String.fromCharCode(65 + cellIndex);
      sheetXml += `<c r="${colRef}${rowIndex + 1}" t="str"><v>${cell}</v></c>`;
    });
    sheetXml += '</row>';
  });
  
  sheetXml += '</sheetData></worksheet>';
  const sheetContent = encoder.encode(sheetXml);

  // ZIP header
  const zipHeader = Buffer.from([
    0x50, 0x4B, 0x03, 0x04,
    0x14, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);

  // Combine content
  const totalLength = zipHeader.length + workbookXml.length + sheetContent.length;
  const fileContent = new Uint8Array(totalLength);
  
  let offset = 0;
  fileContent.set(zipHeader, offset);
  offset += zipHeader.length;
  fileContent.set(workbookXml, offset);
  offset += workbookXml.length;
  fileContent.set(sheetContent, offset);

  return new File([fileContent], fileName, { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

/**
 * Generates a minimal PPTX file as a File object
 */
export function generateDummyPptx(
  fileName: string = 'test-presentation.pptx',
  slideContent: string = 'Test Slide'
): File {
  // Minimal PPTX structure
  const encoder = new TextEncoder();
  
  const presentationXml = encoder.encode(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:sldIdLst><p:sldId id="256" r:id="rId2" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></p:sldIdLst>' +
    '</p:presentation>'
  );

  const slideXml = encoder.encode(
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">' +
    '<p:spTree>' +
    '<p:sp><p:txBody><a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>' +
    '<a:lstStyle/><a:p><a:r><a:t>' + slideContent + '</a:t></a:r></a:p></p:txBody></p:sp>' +
    '</p:spTree>' +
    '</p:sld>'
  );

  // ZIP header
  const zipHeader = Buffer.from([
    0x50, 0x4B, 0x03, 0x04,
    0x14, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);

  // Combine content
  const totalLength = zipHeader.length + presentationXml.length + slideXml.length;
  const fileContent = new Uint8Array(totalLength);
  
  let offset = 0;
  fileContent.set(zipHeader, offset);
  offset += zipHeader.length;
  fileContent.set(presentationXml, offset);
  offset += presentationXml.length;
  fileContent.set(slideXml, offset);

  return new File([fileContent], fileName, { 
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
  });
}

/**
 * Generates an old-style Word .doc file (binary format marker)
 */
export function generateDummyDoc(
  fileName: string = 'test-document.doc'
): File {
  // Minimal binary structure for .doc format
  // Word 97-2003 format starts with specific header bytes
  const docHeader = Buffer.from([
    0xD0, 0xCF, 0x11, 0xE0, // Compound File Binary Format header
    0xA1, 0xB1, 0x1A, 0xE1,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x3E, 0x00, 0x03, 0x00, // Minor/major version
    0xFE, 0xFF, 0x09, 0x00,
  ]);

  const encoder = new TextEncoder();
  const content = encoder.encode('Test document content');

  const totalLength = docHeader.length + content.length;
  const fileContent = new Uint8Array(totalLength);
  
  fileContent.set(docHeader, 0);
  fileContent.set(content, docHeader.length);

  return new File([fileContent], fileName, { 
    type: 'application/msword' 
  });
}
