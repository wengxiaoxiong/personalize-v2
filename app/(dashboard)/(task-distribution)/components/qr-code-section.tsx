"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Download, Loader2, ExternalLink } from "lucide-react";
import { generateBatchQRCodes } from "@/app/actions/task-distribution";

interface QRCodeSectionProps {
  batchId: string;
  platforms: string[];
}

export function QRCodeSection({ batchId, platforms }: QRCodeSectionProps) {
  const [qrCodes, setQrCodes] = useState<
    Array<{ platform: string; qrUrl: string; qrImageUrl?: string }>
  >([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateBatchQRCodes(batchId);
      if (result.ok && result.data) {
        setQrCodes(result.data);
      } else {
        setError(result.message || "生成二维码失败");
      }
    } catch (error) {
      console.error("生成二维码失败:", error);
      setError(error instanceof Error ? error.message : "生成二维码失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (qrImageUrl: string | undefined, platform: string) => {
    if (!qrImageUrl) return;
    const link = document.createElement("a");
    link.href = qrImageUrl;
    link.download = `${batchId.slice(0, 8)}-${platform}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>二维码生成</CardTitle>
        <CardDescription>为每个平台生成二维码，用户扫码后即可获取任务</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrCodes.length === 0 ? (
          <div className="text-center py-8">
            <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              点击下方按钮为 {platforms.length} 个平台生成二维码
            </p>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  生成二维码
                </>
              )}
            </Button>
            {error && (
              <p className="text-sm text-destructive mt-4">{error}</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qrCodes.map((qr) => (
              <div
                key={qr.platform}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{qr.platform}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!qr.qrImageUrl}
                    onClick={() => handleDownload(qr.qrImageUrl, qr.platform)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    下载
                  </Button>
                </div>
                {/* PC 端访问链接 */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">PC 端访问：</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <a
                      href={qr.qrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      打开任务页面
                    </a>
                  </Button>
                </div>
                
                {/* 手机端二维码 */}
                {qr.qrImageUrl ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">手机端扫码：</p>
                    <div className="flex justify-center">
                      <img
                        src={qr.qrImageUrl}
                        alt={`${qr.platform} 二维码`}
                        className="w-48 h-48 border rounded"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    <QrCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>二维码生成失败</p>
                    <p className="mt-1">请使用 PC 端链接访问</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

