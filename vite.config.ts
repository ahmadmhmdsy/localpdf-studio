import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {readFileSync} from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

// OCR runs on a same-origin worker and WASM core (the CSP blocks the
// tesseract.js CDN defaults). Served from node_modules in dev, emitted under
// dist/tesseract on build. Language data lives in public/tesseract/lang.
const OCR_ASSETS: Record<string, string> = {
  'tesseract/worker.min.js': 'node_modules/tesseract.js/dist/worker.min.js',
  'tesseract/core/tesseract-core-lstm.wasm.js': 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
  'tesseract/core/tesseract-core-simd-lstm.wasm.js': 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
};

function ocrAssets(): Plugin {
  return {
    name: 'localpdf-ocr-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0].replace(/^\//, '') ?? '';
        const source = OCR_ASSETS[url];
        if (!source) return next();
        res.setHeader('Content-Type', 'text/javascript');
        res.end(readFileSync(path.resolve(__dirname, source)));
      });
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(OCR_ASSETS)) {
        this.emitFile({type: 'asset', fileName, source: readFileSync(path.resolve(__dirname, source))});
      }
    },
  };
}

// Tauri runs the dev server on a fixed port and host. Set TAURI_DEV=1 when
// launching via `tauri dev` so we hand Vite the URL Tauri expects.
// Reference: https://v2.tauri.app/start/frontend/vite/
const TAURI_DEV_HOST = '127.0.0.1';
const TAURI_DEV_PORT = 1420;

// No `define` and no unprefixed `loadEnv`: the public web bundle must not be
// able to inline any build-time value, including an API key. The desktop build
// reads the user-owned key from tauri-plugin-store at runtime instead.
export default defineConfig(() => {
  // Tauri injects TAURI_DEV=1 into the env when launched from `tauri dev`.
  const isTauriDev = process.env.TAURI_DEV === '1';

  return {
    plugins: [react(), tailwindcss(), ocrAssets()],
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
            'pdf-lib': ['pdf-lib'],
            'pdfjs': ['pdfjs-dist'],
            // Heavy libraries - dynamic only
            'tesseract': ['tesseract.js'],
            // One chunk per office library: each tool loads only the one it needs.
            'mammoth': ['mammoth'],
            'docx': ['docx'],
            'exceljs': ['exceljs'],
            'ai': ['@google/genai'],
          },
        },
      },
      chunkSizeWarningLimit: 800, // Warn earlier so we can split heavy chunks before they grow further
    },
    server: {
      // Tauri dev: fixed host/port so tauri.conf.json devUrl resolves correctly.
      host: isTauriDev ? TAURI_DEV_HOST : undefined,
      port: isTauriDev ? TAURI_DEV_PORT : 3000,
      strictPort: isTauriDev,
      hmr: isTauriDev
        ? { host: TAURI_DEV_HOST, port: TAURI_DEV_PORT, protocol: 'ws' }
        : process.env.DISABLE_HMR !== 'true',
      // Don't clear the screen so cargo build output stays visible during `tauri dev`.
      clearScreen: false,
    },
    // Tauri expects a known good dev URL.
    envPrefix: ['VITE_', 'TAURI_'],
    clearScreen: false,
  };
});
