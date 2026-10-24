# Data Flow

| Tool class | Current public behavior | Data boundary |
|---|---|---|
| Local-only | Enabled or limited tools process the selected file in the browser. | File bytes and derived output stay in the browser process. |
| Optional network | AI Summarizer and Translate PDF are unavailable in the public beta. | A future implementation must disclose Google Gemini as the destination and require explicit consent before sending extracted text. |
| Camera | Scan to PDF is unavailable in the public beta. | No camera permission is requested by the current public route. |

The editor does persist data on the device, and this note states exactly what. `src/store/documentStore.ts` writes the opened document's bytes, name, and type to IndexedDB under `editor-file-buffer`, `editor-file-name`, and `editor-file-type`; `src/store/annotationsStore.ts` writes the edit history under `editor-history` and `editor-history-index`; and `src/contexts/EditorContext.tsx` restores both on mount. That storage is local to the app on the device and has no automatic expiry: the browser's IndexedDB in the web build, and the app WebView's IndexedDB in the desktop build. It is removed by the editor's **Close File** control (the document keys) or by clearing the stored data for the app (site data in the browser, app data on the desktop). Retention, settings, and consent records are not a substitute for a reviewed retention design, and the beta claims no durable deletion guarantee beyond that behavior.

The public beta does not send files, prompts, filenames, or images to AI, OCR, or camera services. OCR (`/tools/ocr-pdf`, release state `limited`) runs entirely in the browser with self-hosted assets; see below. The disabled routes must remain disabled until a separate implementation plan provides local assets, consent, cancellation, limits, and independent verification.

## Third-party asset loading

The public beta loads **no third-party assets**. `index.html` declares no external stylesheet,
preconnect, script, or font; the app renders with system font stacks only; and the browser gate
asserts that no route contacts a font host. Measured in Chromium against the production preview
build, the only host contacted on `/`, `/tools/merge-pdf`, `/tools/ocr-pdf`, and an unknown route
is the serving origin itself.

- **No web fonts, and none were in use.** `index.html` used to declare two `preconnect` hints and
  a Google Fonts stylesheet. The stylesheet completed on every page view, so a visitor's IP address and
  user agent reached Google, while every web-font file request was refused by the shipped CSP
  (`font-src 'self' data:`) and the UI already rendered the system stack. Those links are removed, the
  two dead family names were dropped from the component styles that referenced them. The computed
  `font-family` is unchanged because those names only ever appeared in a `font-family` list whose first
  entry is a system stack: `Plus Jakarta Sans` and `DM Mono` were removed from the footer, header, tool
  layout, API key settings, and download state. `JetBrains Mono` was deliberately kept in the bento skin
  (the home page tiles and `src/theme/skins/bento.css`), where the monospace stack is the intended face
  rather than a dead reference.
- **OCR assets are self-hosted, including English language data.** `src/lib/ocr.ts` loads
  `tesseract.js` on demand and passes it same-origin `workerPath`, `corePath` and `langPath` values
  under `${BASE_URL}tesseract/`, with `workerBlobURL: false` because the CSP has no `blob:` worker
  source. The `ocrAssets()` plugin in `vite.config.ts` serves and emits the worker and the LSTM core
  files (`dist/tesseract/`), so no CDN is contacted. Language data (`<lang>.traineddata.gz`) is served
  from `public/tesseract/lang/`; only `eng` is included (tessdata_fast 4.1.0, source and checksums in
  that folder's README). For any other language `ocrPdf` stops with
  `OcrLanguageDataMissingError` before starting a worker. OCR is enabled as `limited` (English only,
  cancellable, 200 pages / 50 MB). Its assets come from the app origin, so the CSP needs no new host
  (`script-src`/`connect-src 'self'` cover the worker and data), and the browser tests assert that the
  OCR route contacts no host other than the one serving the app.
- **The Gemini SDK is shipped but inert.** `dist/index.html` modulepreloads the `ai` chunk, so the
  `@google/genai` JavaScript is downloaded by every route. The SDK holds no key and makes no request
  without one; the web build has no key channel at all (see `src/config/viteKeyChannel.test.ts`).

## Content Security Policy is not the AI containment boundary

The shipped `index.html` CSP still lists `https://generativelanguage.googleapis.com` in
`connect-src`, alongside `ws://localhost:*` for dev-server HMR. AI egress containment therefore
rests on **routing**, not on the CSP: the disabled routes never mount a workflow, and the browser
tests assert that they load no tool chunk, no OCR/PDF worker, and reach no host other than the one
serving the app. The chunk assertion is re-checked against the built assets on every run, so a bundler
change that renames tool chunks is reported instead of quietly turning that signal into a no-op. A
future change that mounts a disabled route, or that enables an AI route, would still be
able to reach the Gemini endpoint because the policy permits it. Tightening `connect-src` to drop
the Gemini origin is a separate, low-risk change that this document recommends but that G1 does not
make.
