type PdfJsInstance = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

let pdfjsPromise: Promise<PdfJsInstance> | null = null;

async function loadPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF 文本提取仅支持在浏览器环境运行');
  }

  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      if (worker?.default) {
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      }
      return pdfjs;
    });
  }

  return pdfjsPromise;
}

export type ExtractedPdfText = {
  text: string;
  pageCount: number;
};

export type ExtractedPdfPageText = {
  pageNumber: number;
  text: string;
};

export const QUICK_PDF_PROMPT_CHAR_LIMIT = 8000;

export async function extractTextFromPdf(file: File): Promise<ExtractedPdfText> {
  const pdfjs = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];

  for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex += 1) {
    const page = await doc.getPage(pageIndex);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => {
        if (typeof (item as { str?: unknown }).str === 'string') {
          return ((item as { str: string }).str || '').trim();
        }
        return '';
      })
      .filter(Boolean)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (pageText) {
      pageTexts.push(pageText);
    }
  }

  const combined = pageTexts.join('\n\n').replace(/\u0000/g, '').trim();

  return {
    text: combined,
    pageCount: doc.numPages,
  };
}

/**
 * 提取PDF每页的文字内容
 * @param file PDF文件
 * @returns 每页的文字内容数组，按页码排序
 */
export async function extractTextFromPdfByPage(file: File): Promise<ExtractedPdfPageText[]> {
  const pdfjs = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: ExtractedPdfPageText[] = [];

  for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex += 1) {
    const page = await doc.getPage(pageIndex);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => {
        if (typeof (item as { str?: unknown }).str === 'string') {
          return ((item as { str: string }).str || '').trim();
        }
        return '';
      })
      .filter(Boolean)
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\u0000/g, '')
      .trim();

    pageTexts.push({
      pageNumber: pageIndex,
      text: pageText || '',
    });
  }

  return pageTexts;
}

export type PdfPageImage = {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
};

export async function extractImagesFromPdf(file: File, scale = 1.5): Promise<PdfPageImage[]> {
  const pdfjs = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pageImages: PdfPageImage[] = [];

  for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex += 1) {
    const page = await doc.getPage(pageIndex);

    // 获取页面尺寸
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      continue;
    }

    // 设置画布尺寸
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // 渲染页面到画布 - pdf.js v3.x 需要canvas参数而不是canvasContext
    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas, // 在新版本pdf.js中需要这个参数
    }).promise;

    // 转换为图片URL
    const imageUrl = canvas.toDataURL('image/png');

    pageImages.push({
      pageNumber: pageIndex,
      imageUrl,
      width: viewport.width,
      height: viewport.height,
    });

    // 清理画布
    canvas.remove();
  }

  return pageImages;
}

export function truncatePdfText(content: string, limit = QUICK_PDF_PROMPT_CHAR_LIMIT) {
  if (content.length <= limit) {
    return { text: content, truncated: false } as const;
  }

  const sliced = content.slice(0, limit);
  return {
    text: `${sliced}...`,
    truncated: true,
  } as const;
}
