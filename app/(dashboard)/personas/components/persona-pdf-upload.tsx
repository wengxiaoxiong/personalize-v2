import React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type PdfUploadControlProps = {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pdfUploading: boolean;
  pdfProgress?: { stage: string; progress: number };
  selectedFileName?: string | null;
  disabled?: boolean;
};

export function PdfUploadControl({
  fileInputRef,
  onFileSelect,
  pdfUploading,
  pdfProgress,
  selectedFileName,
  disabled,
}: PdfUploadControlProps) {
  return (
    <div className="flex items-center flex-wrap gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={onFileSelect}
        className="hidden"
        disabled={pdfUploading || disabled}
        id="pdf-upload"
      />
      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={() => fileInputRef.current?.click()}
        disabled={pdfUploading || disabled}
        className="flex items-center gap-2"
      >
        <FileText className="h-5 w-5" />
        {pdfUploading ? "解析中..." : "上传简历/PDF"}
      </Button>

      {pdfUploading && pdfProgress && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{pdfProgress.stage}</span>
          <span className="text-primary">{Math.round(pdfProgress.progress * 100)}%</span>
        </div>
      )}

      {selectedFileName && !pdfUploading && (
        <span className="truncate text-sm text-muted-foreground max-w-[220px]">{selectedFileName}</span>
      )}
    </div>
  );
}
