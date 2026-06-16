import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Core - always loaded
            'core': ['react', 'react-dom', 'react-router-dom'],
            // PDF processing - loaded when tool accessed
            'pdf-lib': ['pdf-lib', 'pdfjs-dist'],
            // Heavy libraries - dynamic only
            'tesseract': ['tesseract.js'],
            'office-parsers': ['mammoth', 'docx', 'exceljs'],
            'ai': ['@google/genai'],
          },
        },
      },
      chunkSizeWarningLimit: 800, // Warn earlier so we can split heavy chunks before they grow further
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
