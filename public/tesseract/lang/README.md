# OCR language data

`src/lib/ocr.ts` loads `<code>.traineddata.gz` from this folder (served at
`${BASE_URL}tesseract/lang/`). OCR checks for the file before starting and reports
`OcrLanguageDataMissingError` when it is absent.

Supported codes (`OCR_LANGUAGES`): `eng`, `ara`. More languages can be added later by placing their
data here and adding the code to `OCR_LANGUAGES`.

Use LSTM ("fast" or "best") models from the Tesseract project (Apache-2.0), gzip-compressed, and
record the source and checksum of each file you add here.

## Included files

| File | Source | License | SHA-256 of the `.gz` | SHA-256 after decompressing |
|---|---|---|---|---|
| `eng.traineddata.gz` | `https://github.com/tesseract-ocr/tessdata_fast/raw/4.1.0/eng.traineddata` (tag `4.1.0`), fetched 2026-10-24, compressed with `gzip -9 -n` | Apache-2.0 | `2a66ec904bc0e7657b27e200a874c01e1bc8a58b756cbbaa9afbae736fa50edc` | `7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2` |
| `ara.traineddata.gz` | `https://github.com/tesseract-ocr/tessdata_fast/raw/4.1.0/ara.traineddata` (tag `4.1.0`), fetched 2026-10-24, compressed with `gzip -9 -n` | Apache-2.0 | `60a0bbe2038fe0418f37fd78182c543317b2fb69358e803984383a81bc4a0ad1` | `e3206d3dc87fd50c24a0fb9f01838615911d25168f4e64415244b67d2bb3e729` |

To check a file: `gzip -dc <code>.traineddata.gz | sha256sum` must print the second checksum.
