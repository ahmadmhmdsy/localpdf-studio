import type { ToolId } from '../../config/featureRegistry';
import type { ToolCategoryId } from '../../constants/tools';

/**
 * Arabic display copy for every catalog tool and category (B1.2).
 *
 * Mirrors `catalog.en.ts` key-for-key; the record types make a missing or
 * extra key a typecheck failure. Release-facing limitations are preserved:
 * unavailable tools stay unavailable, PDF/A-style output stays "not validated
 * as PDF/A-conformant", and Blackout PDF is not a confidentiality boundary.
 * Format/product tokens (PDF, PDF/A, JPG, DOCX, Gemini API, pdf-lib, …) stay in
 * Latin script, as Arabic technical UI copy conventionally does.
 */
export const toolCopyAr: Record<ToolId, { name: string; description: string }> = {
  'merge-pdf': {
    name: 'دمج PDF',
    description: 'اجمع ملفات PDF بالترتيب الذي تختاره في مستند واحد.',
  },
  'split-pdf': {
    name: 'تقسيم PDF',
    description: 'قسّم ملف PDF إلى ملفات منفصلة حسب نطاق الصفحات، أو كل N صفحات، أو صفحة واحدة لكل ملف.',
  },
  'remove-pages': {
    name: 'حذف الصفحات',
    description: 'احذف الصفحات التي تختارها واحفظ ملف PDF جديدًا بالصفحات المتبقية.',
  },
  'extract-pages': {
    name: 'استخراج الصفحات',
    description: 'احصل على مستند جديد يحتوي على الصفحات المطلوبة فقط.',
  },
  'organize-pdf': {
    name: 'تنظيم PDF',
    description: 'رتّب صفحات PDF وأضفها واحذفها. اسحب صور الصفحات وأفلِتها ورتّبها كما تشاء.',
  },
  'scan-to-pdf': {
    name: 'المسح إلى PDF',
    description: 'غير متاح — معطّل بانتظار المعالجة. راجع جرد الإنتاج للتفاصيل.',
  },
  'compress-pdf': {
    name: 'ضغط PDF',
    description:
      'قلّل حجم الملف بإعادة حزم تدفقات PDF، وبخفض دقة الصور المضمّنة اختياريًا. إعادة ترميز الصور عملية بلا رجعة.',
  },
  'repair-pdf': {
    name: 'إصلاح PDF',
    description:
      'حاول إصلاح ملف PDF تالف بإعادة تحليله وإعادة حفظه. والملف الذي يتعذّر إصلاحه يُبلِغ بفشل واضح بدلًا من إنتاج ملف بديل.',
  },
  'ocr-pdf': {
    name: 'التعرّف الضوئي OCR PDF',
    description: 'اجعل ملفات PDF الممسوحة ضوئيًا قابلة للبحث. يجري التعرّف على النص على جهازك؛ ولا يُرفَع ملفك.',
  },
  'jpg-to-pdf': {
    name: 'JPG إلى PDF',
    description: 'حوّل صور JPG وPNG إلى ملف PDF واحد، بصورة لكل صفحة، وأحجام صفحات مأخوذة من DPI الخاصة بكل صورة.',
  },
  'html-to-pdf': {
    name: 'HTML إلى PDF',
    description: 'حوّل HTML المُلصق إلى PDF منسّق على صفحات A4، عموديًا أو أفقيًا؛ ولا تُجلب عناوين URL الخارجية.',
  },
  'word-to-pdf': {
    name: 'WORD إلى PDF',
    description: 'حوّل مستندات DOCX إلى PDF بتخطيط تقريبي.',
  },
  'excel-to-pdf': {
    name: 'EXCEL إلى PDF',
    description: 'حوّل جداول XLSX إلى PDF بتخطيط جدولي أساسي.',
  },
  'powerpoint-to-pdf': {
    name: 'POWERPOINT إلى PDF',
    description: 'حوّل شرائح PPTX إلى PDF بتخطيط تقريبي.',
  },
  'pdf-to-jpg': {
    name: 'PDF إلى JPG',
    description: 'اعرض كل صفحة من PDF كصورة JPG ونزّلها في ملف ZIP.',
  },
  'pdf-to-pdfa': {
    name: 'PDF إلى PDF/A-style',
    description: 'طبّق بيانات وصفية بأسلوب PDF/A للأرشفة؛ المخرجات غير مُتحقَّق من مطابقتها لمعيار PDF/A.',
  },
  'pdf-to-word': {
    name: 'PDF إلى WORD',
    description: 'حوّل نص PDF إلى مستند Word قابل للتحرير بفقرات تقريبية.',
  },
  'pdf-to-excel': {
    name: 'PDF إلى EXCEL',
    description: 'استخرج النص الجدولي من PDF إلى مصنف Excel بالاعتماد على كشف استدلالي.',
  },
  'pdf-to-powerpoint': {
    name: 'PDF إلى POWERPOINT',
    description: 'غير متاح — معطّل بانتظار المعالجة. راجع جرد الإنتاج للتفاصيل.',
  },
  'rotate-pdf': {
    name: 'تدوير PDF',
    description: 'دوّر صفحات PDF بزوايا 90° أو 180° أو 270°. تُدوَّر كل الصفحات بالزاوية نفسها.',
  },
  'add-page-numbers': {
    name: 'إضافة أرقام الصفحات',
    description: 'أضف أرقام الصفحات إلى كل صفحة في PDF. اختر من 9 مواضع (الزوايا، الحواف، الوسط).',
  },
  'add-watermark': {
    name: 'إضافة علامة مائية',
    description: 'اطبع علامة مائية نصية أو صورة PNG/JPEG على مستند PDF، مع التحكم في الحجم والشفافية والتدوير ونطاق الصفحات.',
  },
  'crop-pdf': {
    name: 'اقتصاص PDF',
    description: 'اقتصّ جميع صفحات PDF إلى المنطقة المحددة نفسها.',
  },
  'edit-pdf': {
    name: 'تحرير PDF',
    description: 'أضف نصوصًا أو صورًا أو أشكالًا أو تعليقات توضيحية حرة إلى مستند PDF.',
  },
  'sign-pdf': {
    name: 'توقيع PDF',
    description: 'ارسم توقيعًا أو اكتبه أو ارفعه، ثم اطبعه على صفحات PDF. تبقى التوقيعات في متصفحك.',
  },
  'blackout-pdf': {
    name: 'تعتيم PDF',
    description: 'غير متاح ريثما تُعالَج أداة التعتيم/الحجب المخصصة؛ ولا تستخدمه كحدّ للسرية.',
  },
  'compare-pdf': {
    name: 'مقارنة PDF',
    description: 'اعرض ملفي PDF جنبًا إلى جنب للمقارنة البصرية. ولا تُكتشف الاختلافات تلقائيًا.',
  },
  'decrypt-pdf': {
    name: 'فك تشفير PDF',
    description: 'غير متاح — pdf-lib لا يدعم فك تشفير PDF. راجع جرد الإنتاج للتفاصيل.',
  },
  'protect-pdf': {
    name: 'حماية PDF',
    description: 'غير متاح — pdf-lib لا يدعم تشفير PDF. راجع جرد الإنتاج للتفاصيل.',
  },
  'ai-summarizer': {
    name: 'ملخّص AI',
    description: 'غير متاح في نسخة الويب — يتطلب مفتاح Gemini API. متاح في نسخة سطح المكتب فقط.',
  },
  'translate-pdf': {
    name: 'ترجمة PDF',
    description: 'غير متاح في نسخة الويب — يتطلب مفتاح Gemini API. متاح في نسخة سطح المكتب فقط.',
  },
};

/** Arabic category headings, shown above each tool group. */
export const categoryCopyAr: Record<ToolCategoryId, string> = {
  organize: 'تنظيم PDF',
  optimize: 'تحسين PDF',
  'convert-to': 'التحويل إلى PDF',
  'convert-from': 'التحويل من PDF',
  edit: 'تحرير PDF',
  security: 'أمان PDF',
  intelligence: 'ذكاء PDF',
};
