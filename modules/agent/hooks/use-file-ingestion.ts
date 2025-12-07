import { useCallback, useState } from "react";

type Progress = {
  stage: string;
  progress: number;
};

type Parser = (file: File, onProgress?: (stage: string, progress: number) => void) => Promise<string>;

type UseFileIngestionOptions = {
  parser: Parser;
  maxSizeMb?: number;
  acceptTypes?: string[];
  onError?: (error: Error) => void;
};

export function useFileIngestion({ parser, maxSizeMb = 10, acceptTypes, onError }: UseFileIngestionOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Progress | undefined>();

  const ingest = useCallback(
    async (file: File) => {
      if (acceptTypes && !acceptTypes.includes(file.type)) {
        const error = new Error("Unsupported file type");
        onError?.(error);
        throw error;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        const error = new Error(`文件大小不能超过 ${maxSizeMb}MB`);
        onError?.(error);
        throw error;
      }

      setUploading(true);
      setProgress({ stage: "开始解析...", progress: 0 });
      try {
        const text = await parser(file, (stage, value) => setProgress({ stage, progress: value }));
        setProgress(undefined);
        return text;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("文件解析失败");
        onError?.(error);
        throw error;
      } finally {
        setUploading(false);
      }
    },
    [acceptTypes, maxSizeMb, onError, parser]
  );

  return {
    ingest,
    uploading,
    progress,
  };
}
