declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs?url' {
  const workerSrc: string;
  export default workerSrc;
}

declare module 'pdfjs-dist/build/pdf.min.mjs' {
  import type * as pdfjs from 'pdfjs-dist';
  const pdfjsModule: {
    default?: typeof pdfjs;
  } & typeof pdfjs;
  export default pdfjsModule;
  export = pdfjsModule;
}
