# Data Flow

| Tool class | Current public behavior | Data boundary |
|---|---|---|
| Local-only | Enabled or limited tools process the selected file in the browser. | File bytes and derived output stay in the browser process. |
| Optional network | AI Summarizer and Translate PDF are unavailable in the public beta. | A future implementation must disclose Google Gemini as the destination and require explicit consent before sending extracted text. |
| Camera | Scan to PDF is unavailable in the public beta. | No camera permission is requested by the current public route. |

Editor history, settings, and consent records are not a substitute for a reviewed retention design. The current beta does not claim durable deletion guarantees beyond the existing browser storage behavior.

The public beta does not send files, prompts, filenames, or images to AI, OCR, or camera services. The disabled routes must remain disabled until a separate implementation plan provides local assets, consent, cancellation, limits, and independent verification.
