/**
 * Generates a simple JPG/PNG image file
 */
export function generateDummyImage(
  fileName: string = 'test-image.jpg',
  _width: number = 400,
  _height: number = 300,
  type: 'image/jpeg' | 'image/png' = 'image/jpeg'
): File {
  // Create minimal valid image byte headers
  const header = type === 'image/jpeg' 
    ? new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01])
    : new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  return new File([header], fileName, { type });
}

/**
 * Generates multiple test images
 */
export function generateDummyImages(count: number = 3): File[] {
  return Array.from({ length: count }, (_, i) => 
    generateDummyImage(`test-image-${i + 1}.jpg`, 400, 300, 'image/jpeg')
  );
}

/**
 * Generates a PNG image with transparency
 */
export function generateTransparentPng(
  fileName: string = 'test-transparent.png'
): File {
  return generateDummyImage(fileName, 400, 300, 'image/png');
}
