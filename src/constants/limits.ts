export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// OCR renders every page at up to 4000 px and keeps the whole document in memory,
// so it gets tighter limits than the general upload cap.
export const MAX_OCR_FILE_SIZE_MB = 50;
export const MAX_OCR_FILE_SIZE_BYTES = MAX_OCR_FILE_SIZE_MB * 1024 * 1024;
export const MAX_OCR_PAGES = 200;
