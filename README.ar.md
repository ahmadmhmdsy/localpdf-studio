<div dir="rtl">

# LocalPDF Studio

**أدوات PDF تحترم خصوصيتك وتعمل بالكامل على جهازك.** ادمج ملفات PDF وقسّمها وحرّرها ووقّعها وحوّلها واستخرج نصوصها بتقنية OCR، في المتصفح أو في تطبيق سطح مكتب. ملفاتك لا تُرفع إلى أي خادم.

![CI](https://github.com/ahmadmhmdsy/localpdf-studio/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue)
![Tests](https://img.shields.io/badge/unit%20tests-775%20passing-brightgreen)
![Stack](https://img.shields.io/badge/React%2019-Vite%206-646cff)

[English](README.md) | **العربية**

<p align="center">
  <img src="docs/assets/demo.gif" alt="عرض لتطبيق LocalPDF Studio: قائمة الأدوات، ودمج ملفي PDF في المتصفح، ومحرر الصفحات" width="960">
</p>

---

## لقطات الشاشة

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/screenshots/home-dark.png">
  <img src="docs/assets/screenshots/home-light.png" alt="الصفحة الرئيسية مع قائمة الأدوات وحالة كل أداة">
</picture>

| دمج PDF | التعرف الضوئي على النصوص (OCR) |
|---|---|
| <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/screenshots/merge-dark.png"><img src="docs/assets/screenshots/merge-light.png" alt="أداة الدمج مع ملفين جاهزين"></picture> | <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/screenshots/ocr-dark.png"><img src="docs/assets/screenshots/ocr-light.png" alt="أداة OCR مع خيارات اللغة ونطاق الصفحات"></picture> |
| **المحرر** | **القيود المعروفة** |
| <img src="docs/assets/screenshots/editor-light.png" alt="محرر الصفحات مع المصغّرات وشريط الأدوات ولوحة الخصائص"> | <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/screenshots/limitations-dark.png"><img src="docs/assets/screenshots/limitations-light.png" alt="صفحة القيود المعروفة لكل أداة"></picture> |

تتبع لقطات الشاشة الوضع الفاتح أو الداكن في GitHub. واجهة التطبيق نفسها باللغة الإنجليزية حاليًا.

## لماذا LocalPDF Studio

معظم أدوات PDF على الإنترنت ترفع مستندك إلى خوادمها. أما LocalPDF Studio فلا يفعل ذلك:

- **🔒 معالجة محلية.** كل أداة مفعّلة تعالج الملف داخل تبويب المتصفح. لا رفع، ولا حساب، ولا تتبّع لمحتوى المستندات.
- **🧾 صراحة في وصف كل أداة.** لكل أداة حالة إصدار (`stable` مستقرة، أو `limited` محدودة، أو `disabled` معطّلة). تعرض صفحة الأداة ما تفعله، وما لا تفعله بعد، وأين تذهب بياناتك. الأدوات غير الجاهزة تُعطَّل بدل أن تُطرح معطوبة.
- **🛡️ مُحكمة افتراضيًا.** سياسة أمان محتوى (CSP) صارمة لا تسمح بأي مضيف أو سكربت أو عامل (worker) من طرف ثالث. محرّكات OCR وبيانات اللغات مستضافة ذاتيًا. وتتحقق اختبارات المتصفح من أن صفحات الأدوات لا تتصل إلا بمصدر التطبيق نفسه.
- **🖥️ ويب وسطح مكتب.** الشيفرة نفسها تُبنى أيضًا كتطبيق سطح مكتب خفيف عبر [Tauri 2](docs/desktop.md) مع نوافذ ملفات أصلية.

## أبرز المزايا

### 🔍 OCR: اجعل ملفات PDF الممسوحة قابلة للبحث *(جديد)*
- يتعرّف على النص في الصفحات الممسوحة باستخدام **Tesseract داخل متصفحك**. العامل ونواة WASM وبيانات اللغتين الإنجليزية والعربية كلها تُقدَّم من التطبيق نفسه.
- يضيف **طبقة نص غير مرئية مطابقة لمواضع الكلمات**، فيتطابق البحث والتحديد مع الصورة الممسوحة، حتى في الصفحات المدوّرة.
- يتخطى الصفحات التي تحتوي نصًا بالفعل، كي لا تتكرر نتائج البحث.
- **قابل للإلغاء في أي لحظة**: زر الإلغاء يوقف المحرّك حتى في منتصف الصفحة.
- **نطاق صفحات اختياري** (`1-3, 7`)، مع حدود واضحة: 200 صفحة و50 ميغابايت لكل عملية.

### ✏️ المحرر
محرر صفحات كامل يضيف النصوص والرسوم والصور والتواقيع المرئية، مع مصغّرات الصفحات، والتراجع والإعادة، واختصارات لوحة المفاتيح (اضغط `?`).

### 🗂️ التنظيم والتحويل
دمج الصفحات وتقسيمها وتدويرها وقصّها وإعادة ترتيبها واستخراجها ومقارنتها. التحويل بين PDF و JPG و Word و Excel و PowerPoint و HTML، إلى جانب ترقيم الصفحات والعلامات المائية والإصلاح.

### ♿ معايير جودة واضحة
- 775 اختبار وحدة ومكوّنات (Vitest + Testing Library).
- بوابات Playwright للاختبار السريع و**إمكانية الوصول عبر axe** على نسخة الإنتاج.
- Lighthouse CI، وميزانية لحجم الحزم، وفحص الأنواع والتدقيق في CI.
- الوضع الداكن، وجولة تعريفية، وإشعارات، وحدود أخطاء لكل أداة.

## حالة الأدوات

المرجع الأساسي هو [`src/config/featureRegistry.ts`](src/config/featureRegistry.ts). يعرض التطبيق قيود كل أداة في صفحتها.

| الحالة | الأدوات |
|---|---|
| ✅ **مستقرة** | Merge PDF · PDF to JPG · Rotate PDF · Crop PDF · Compare PDF |
| 🟡 **محدودة**: تعمل، مع قيود موثّقة | OCR PDF *(الإنجليزية، العربية)* · Split PDF · Remove Pages · Extract Pages · Organize PDF · Repair PDF · JPG to PDF · HTML to PDF · Word to PDF · Excel to PDF · PowerPoint to PDF · PDF to PDF/A-style *(بيانات وصفية فقط، غير مُتحقَّق من مطابقتها)* · PDF to Word · PDF to Excel · Add Page Numbers · Add Watermark · Edit PDF *(يضيف طبقات فوق الصفحة)* · Sign PDF *(توقيع مرئي، غير مدعوم بشهادة)* |
| ⛔ **معطّلة**: قيد التطوير | Compress PDF · Scan to PDF · PDF to PowerPoint · Protect PDF · Unlock PDF · Redact (Blackout) PDF · AI Summarizer · Translate PDF |

خطة المرحلة A لتفعيل الأدوات المعطّلة موجودة في [`docs/superpowers/plans/2026-10-24-phase-a-tools.md`](docs/superpowers/plans/2026-10-24-phase-a-tools.md).

## البدء السريع

المتطلبات: Node.js `22.14.0` و npm `11.16.0` (مثبّتة في `engines` داخل `package.json`؛ يُنصح بـ [fnm](https://github.com/Schniz/fnm) مع Corepack).

<div dir="ltr">

```sh
fnm install 22.14.0 && fnm use 22.14.0
corepack enable npm && corepack prepare npm@11.16.0 --activate

npm ci          # install the exact locked dependency graph
npm run dev     # http://localhost:3000
```

</div>

لا حاجة إلى مفاتيح API أو إعداد بيئة. نسخة الويب لا تقرأ أي مفتاح API ولا تقبله. قيم `VITE_*` تُدمج في JavaScript العام، لذلك لا يُقرأ `VITE_GEMINI_API_KEY` عمدًا.

### تطبيق سطح المكتب

<div dir="ltr">

```sh
npm run tauri:dev     # requires Rust + MSVC build tools on Windows
npm run tauri:build
```

</div>

راجع [docs/desktop.md](docs/desktop.md) للمتطلبات والتفاصيل.

## الأوامر

| الأمر | الوظيفة |
|---|---|
| `npm run dev` | خادم التطوير على المنفذ 3000 |
| `npm run build` | بناء نسخة الإنتاج في `dist/` |
| `npm run preview` | تشغيل نسخة الإنتاج |
| `npm run typecheck` | فحص TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm test` | اختبارات الوحدات والمكوّنات (Vitest) |
| `npm run test:coverage` | الاختبارات مع تقرير التغطية |
| `npm run test:e2e` | بوابات Playwright للاختبار السريع وإمكانية الوصول على نسخة الإنتاج |
| `npm run check:bundle` | ميزانية حجم كل حزمة |
| `npm run test:lhci` | Lighthouse CI |

تحتاج اختبارات المتصفح إلى تثبيت Chromium مرة واحدة (`npx playwright install chromium`) وإلى بناء (`npm run build`). يشغّل `npm run test:e2e` خادم `vite preview` خاصًا به على `127.0.0.1:4173`.

## التقنيات المستخدمة

| المجال | الاختيار |
|---|---|
| الواجهة | React 19، TypeScript، Tailwind CSS v4 |
| البناء | Vite 6، مع تقسيم المكتبات الثقيلة إلى حزم تُحمَّل عند الحاجة |
| PDF | pdf-lib (الكتابة)، pdfjs-dist (العرض والنص) |
| OCR | tesseract.js 5، مع عامل ونواة وبيانات `tessdata_fast` مستضافة ذاتيًا |
| المستندات المكتبية | mammoth، docx، exceljs |
| إدارة الحالة | Zustand |
| سطح المكتب | Tauri 2 (Rust) |
| الاختبار | Vitest، Testing Library، Playwright، axe-core، Lighthouse CI |

## بنية المشروع

<div dir="ltr">

```
src/
├── components/   # editor, shared tool UI (upload zone, processing state, availability gate), layout
├── config/       # featureRegistry: release state, privacy class and limits for every tool
├── pages/tools/  # one page per tool (31)
├── lib/          # PDF, OCR, compression, conversion and security logic
├── store/        # Zustand stores
├── constants/    # tool catalog, limits
└── tests/        # setup, fixtures, helpers
e2e/              # Playwright smoke + accessibility specs
src-tauri/        # desktop shell
docs/             # privacy data flow, release inventory, plans, competitive analysis
```

</div>

## الخصوصية والأمان

- يصف [docs/privacy/data-flow.md](docs/privacy/data-flow.md) لكل أداة أين تذهب البيانات، وبوابة الإصدار التي يجب أن تجتازها الأداة قبل تفعيلها.
- يحتوي [docs/release/production-inventory.md](docs/release/production-inventory.md) على أدلة التدقيق لحالة إصدار كل أداة.
- القيود المعروفة مذكورة بوضوح. التوقيع مرئي وليس تشفيريًا. أداة الحجب (Redaction) المخصّصة وحماية كلمة المرور معطّلتان حتى تصبحا حقيقيتين. يدعم OCR حاليًا الإنجليزية والعربية.

## خارطة الطريق

- **الضغط:** تقليل دقة الصور الفعلي منفَّذ وينتظر التحقق قبل الإصدار.
- **الحماية / فك القفل:** تشفير AES حقيقي عبر نسخة qpdf (WASM) مستضافة ذاتيًا.
- **حجب حقيقي** يزيل المحتوى الأصلي، لا يغطيه فقط.
- **المسح إلى PDF** مع بديل لرفع ملفات الصور.
- لغات OCR إضافية (الفرنسية، الألمانية، الإسبانية، …).
- تحويلات مكتبية بدقة أعلى.

## الترخيص

[MIT](LICENSE)

</div>
