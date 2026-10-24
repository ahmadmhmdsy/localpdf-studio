# OCR language data

`src/lib/ocr.ts` loads `<code>.traineddata.gz` from this folder (served at
`${BASE_URL}tesseract/lang/`). OCR checks for the file before starting and reports
`OcrLanguageDataMissingError` when it is absent.

Supported codes (`OCR_LANGUAGES`): `eng`, `fra`, `deu`, `spa`, `ita`, `por`, `nld`.

Use LSTM ("fast" or "best") models from the Tesseract project (Apache-2.0), gzip-compressed, and
record the source and checksum of each file you add here.

## Included files

| File | Source | License | SHA-256 of the `.gz` | SHA-256 after decompressing |
|---|---|---|---|---|
| `eng.traineddata.gz` | `https://github.com/tesseract-ocr/tessdata_fast/raw/4.1.0/eng.traineddata` (tag `4.1.0`), fetched 2026-10-24, compressed with `gzip -9 -n` | Apache-2.0 | `2a66ec904bc0e7657b27e200a874c01e1bc8a58b756cbbaa9afbae736fa50edc` | `7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2` |

To check a file: `gzip -dc eng.traineddata.gz | sha256sum` must print the second checksum.
