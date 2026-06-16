import { Accept } from 'react-dropzone';

export const PDF_ACCEPT: Accept = {
  'application/pdf': ['.pdf']
};

export const IMAGE_ACCEPT: Accept = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

export const WORD_ACCEPT: Accept = {
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

export const EXCEL_ACCEPT: Accept = {
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
};

export const POWERPOINT_ACCEPT: Accept = {
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
};

export const DOCUMENT_ACCEPT: Accept = {
  ...PDF_ACCEPT,
  ...WORD_ACCEPT,
  ...EXCEL_ACCEPT,
  ...POWERPOINT_ACCEPT
};