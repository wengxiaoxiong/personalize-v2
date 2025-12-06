/**
 * PDF 文字提取工具
 * 参考你的代码：PDF转图片，然后用 OCR 提取文字
 */

// PDF.js types
interface PDFJSLib {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (options: { data: ArrayBuffer }) => {
    promise: Promise<PDFDocument>;
  };
}

interface PDFDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PDFPage>;
}

interface PDFPage {
  getViewport: (options: { scale: number }) => PDFViewport;
  render: (context: { canvasContext: CanvasRenderingContext2D | null; viewport: PDFViewport }) => {
    promise: Promise<void>;
  };
}

interface PDFViewport {
  height: number;
  width: number;
}

declare global {
  interface Window {
    pdfjsLib: PDFJSLib;
  }
}

// Tesseract.js 语言包配置（中文+英文）
const TESSERACT_LANG = "chi_sim+eng";

/**
 * 加载 PDF.js 库（参考你的代码）
 */
async function loadPDFJS(): Promise<PDFJSLib> {
  if (window.pdfjsLib) return window.pdfjsLib;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(window.pdfjsLib);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * PDF 转图片（参考你的代码）
 */
async function convertPDFToImages(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<Array<{ dataUrl: string; pageNumber: number }>> {
  const pdfjsLib = await loadPDFJS();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const images: Array<{ dataUrl: string; pageNumber: number }> = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const scale = 2.0; // Higher scale for better quality
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    const dataUrl = canvas.toDataURL("image/png", 0.95);
    images.push({
      dataUrl,
      pageNumber: pageNum,
    });

    onProgress?.(pageNum, numPages);
  }

  return images;
}

/**
 * 提取 PDF 文字（PDF转图片 + OCR）
 */
export async function parsePdfToText(
  file: File,
  onProgress?: (stage: string, progress: number) => void
): Promise<string> {
  onProgress?.("正在加载PDF...", 0.05);

  // 步骤1：PDF 转图片
  onProgress?.("正在将PDF转换为图片...", 0.1);
  const pageImages = await convertPDFToImages(file, (page, total) => {
    const progress = 0.1 + (page / total) * 0.3;
    onProgress?.(`正在转换第 ${page}/${total} 页...`, progress);
  });

  if (pageImages.length === 0) {
    throw new Error("PDF 转图片失败");
  }

  console.log(`PDF 转换完成，共 ${pageImages.length} 页`);

  // 步骤2：OCR 识别文字
  onProgress?.("正在加载 OCR 引擎...", 0.4);
  const Tesseract = (await import("tesseract.js")).default;
  console.log("Tesseract.js 加载成功");

  // 限制最多处理前 5 页
  const maxPages = Math.min(5, pageImages.length);
  const ocrResults: string[] = [];

  for (let i = 0; i < maxPages; i++) {
    const pageImage = pageImages[i];
    const progressStart = 0.4;
    const progressRange = 0.55;
    const pageProgress = progressStart + (i / maxPages) * progressRange;

    try {
      console.log(`开始 OCR 第 ${pageImage.pageNumber} 页...`);
      onProgress?.(`正在OCR识别第 ${pageImage.pageNumber}/${pageImages.length} 页...`, pageProgress);

      const { data: { text } } = await Tesseract.recognize(
        pageImage.dataUrl,
        TESSERACT_LANG,
        {
          logger: (m: { status?: string; progress?: number }) => {
            if (m.status === "recognizing text" && onProgress && typeof m.progress === "number") {
              const currentPageProgress = (i + m.progress) / maxPages;
              const overallProgress = progressStart + currentPageProgress * progressRange;
              onProgress(`正在识别第 ${pageImage.pageNumber} 页...`, overallProgress);
            }
          },
        }
      );

      const cleanedText = text.trim();
      if (cleanedText) {
        ocrResults.push(cleanedText);
        console.log(`页面 ${pageImage.pageNumber} OCR 完成，提取 ${cleanedText.length} 个字符`);
      }
    } catch (err) {
      console.error(`页面 ${pageImage.pageNumber} OCR 失败:`, err);
    }
  }

  const finalText = ocrResults.join("\n\n");
  console.log(`OCR 完成，共提取 ${finalText.length} 个字符`);

  if (!finalText || finalText.trim().length === 0) {
    throw new Error(
      "未能从PDF中提取到文字内容。\n\n" +
      "可能的原因：\n" +
      "1. PDF图片质量较低或模糊\n" +
      "2. PDF文件损坏\n" +
      "3. OCR识别失败（首次使用需要下载语言包，请等待）\n\n" +
      "建议：\n" +
      "- 确保PDF图片清晰\n" +
      "- 检查网络连接（首次使用需要下载OCR语言包）\n" +
      "- 尝试使用其他PDF文件"
    );
  }

  onProgress?.("文字提取完成", 1.0);
  return finalText.trim();
}
