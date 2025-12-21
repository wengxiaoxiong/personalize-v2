/* eslint-disable @typescript-eslint/no-explicit-any */
import { type PDFDocumentProxy } from 'pdfjs-dist';

// 1. 定义类型：使用 any 绕过 TS 对 ESM default 导出的检查
type PdfJsInstance = any;

let pdfjsPromise: Promise<PdfJsInstance> | null = null;

// lib/browser-text-extractor.ts

async function loadPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF 文本提取仅支持在浏览器环境运行');
  }

  if (!pdfjsPromise) {
    // 👇 加上这一行注释，TS 就不会报错了
    pdfjsPromise = import('pdfjs-dist/build/pdf.min.mjs').then((mod) => {
      // 3. 强行转换类型，处理 Webpack 的 default 导出包裹
      const pdfjsModule = mod as any;
      const pdfjs = pdfjsModule.default || pdfjsModule;

      // 4. 关键修复：直接指定 CDN Worker 地址
      // 必须与你 package.json 中的 pdfjs-dist 版本号严格一致
      const version = pdfjs.version || '5.4.449'; 
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

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
  // 加载文档
  const doc: PDFDocumentProxy = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];

  for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex += 1) {
    const page = await doc.getPage(pageIndex);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item: any) => {
        // 简单判断 str 属性
        if (typeof item?.str === 'string') {
          return (item.str || '').trim();
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

export async function extractTextFromPdfByPage(file: File): Promise<ExtractedPdfPageText[]> {
  const pdfjs = await loadPdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const doc: PDFDocumentProxy = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: ExtractedPdfPageText[] = [];

  for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex += 1) {
    const page = await doc.getPage(pageIndex);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item: any) => {
        if (typeof item?.str === 'string') {
          return (item.str || '').trim();
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
  const doc: PDFDocumentProxy = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pageImages: PdfPageImage[] = [];
  const totalPages = doc.numPages;

  console.log(`开始提取PDF图片，总页数: ${totalPages}`);

  for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
    try {
      const page = await doc.getPage(pageIndex);

      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        console.warn(`第 ${pageIndex} 页: 无法获取canvas context，跳过`);
        continue;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas, 
      }).promise;

      const imageUrl = canvas.toDataURL('image/png');

      pageImages.push({
        pageNumber: pageIndex,
        imageUrl,
        width: viewport.width,
        height: viewport.height,
      });

      canvas.remove();

      if (pageIndex % 10 === 0) {
        console.log(`已处理 ${pageIndex}/${totalPages} 页`);
      }
    } catch (error) {
      console.error(`第 ${pageIndex} 页处理失败:`, error);
      continue;
    }
  }

  console.log(`PDF图片提取完成，成功提取 ${pageImages.length}/${totalPages} 页`);
  
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