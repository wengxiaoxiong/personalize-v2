"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, QrCode, Download, ExternalLink } from "lucide-react";
import { createTaskBatchFromCsv } from "@/app/actions/task-distribution";
import { useRouter } from "next/navigation";

interface UploadResult {
  batchId: string;
  platformStats: Record<string, number>;
  qrCodes?: Array<{
    platform: string;
    qrUrl: string; // PC 端直接访问链接
    qrImageUrl?: string; // 二维码图片 URL（可选）
  }>;
}

export function TaskBatchUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const router = useRouter();

  // 下载 CSV 模板
  const downloadTemplate = () => {
    const template = `platform,url,comment1,comment2,comment3,comment4,comment5
小红书,https://www.xiaohongshu.com/explore/69009d26000000000301ab93?xsec_token=ABLic6U1UbGbe6GMPBg_zE_WGpuwKJibvpdAcb8t_zGYo=&xsec_source=pc_search&source=unknown,太棒了！,支持支持,学到了,感谢分享,已收藏
抖音,https://www.douyin.com/video/xxxxx,666,已关注,太有用了,马上试试,点赞了
快手,https://www.kuaishou.com/video/xxxxx,老铁666,支持一下,内容很棒,学习了,转发了`;

    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template.csv";
    link.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setError("请选择 CSV 文件");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // 优先尝试 UTF-8 编码读取
      let fileContent: string;
      try {
        fileContent = await file.text(); // 默认 UTF-8
        // 检测是否可能是乱码（包含替换字符或无效字符）
        if (fileContent.includes("\ufffd")) {
          // 如果包含替换字符，尝试使用 ArrayBuffer 并在服务端处理
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          // 发送 ArrayBuffer 的 base64 编码，让服务端尝试 GBK
          const base64 = btoa(String.fromCharCode(...uint8Array));
          const result = await createTaskBatchFromCsv({
            fileContent: base64,
            fileName: file.name,
            encoding: "gbk",
          });
          if (result.ok && result.data) {
            setSuccess(`批次创建成功！共 ${Object.keys(result.data.platformStats).length} 个平台`);
            setUploadResult({
              batchId: result.data.batchId,
              platformStats: result.data.platformStats,
              qrCodes: result.data.qrCodes,
            });
            router.refresh();
            e.target.value = "";
            return;
          }
        }
      } catch (error) {
        // UTF-8 读取失败，尝试 GBK
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const base64 = btoa(String.fromCharCode(...uint8Array));
        const result = await createTaskBatchFromCsv({
          fileContent: base64,
          fileName: file.name,
          encoding: "gbk",
        });
        if (result.ok && result.data) {
          setSuccess(`批次创建成功！共 ${Object.keys(result.data.platformStats).length} 个平台`);
          setUploadResult({
            batchId: result.data.batchId,
            platformStats: result.data.platformStats,
            qrCodes: result.data.qrCodes,
          });
          router.refresh();
          e.target.value = "";
          return;
        }
        throw error;
      }

      // 调用 Server Action 创建批次（UTF-8）
      const result = await createTaskBatchFromCsv({
        fileContent,
        fileName: file.name,
        encoding: "utf-8",
      });

      if (result.ok && result.data) {
        setSuccess(`批次创建成功！共 ${Object.keys(result.data.platformStats).length} 个平台`);
        setUploadResult({
          batchId: result.data.batchId,
          platformStats: result.data.platformStats,
          qrCodes: result.data.qrCodes,
        });
        // 刷新页面数据
        router.refresh();
        // 清空文件选择
        e.target.value = "";
      } else {
        setError(result.message || "上传失败");
      }
    } catch (error) {
      console.error("上传失败:", error);
      setError(error instanceof Error ? error.message : "上传失败，请稍后重试");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>上传任务批次</CardTitle>
        <CardDescription>
          上传 CSV 文件批量创建评论任务。CSV 格式应包含 platform、url 和 comment1, comment2...
          等列。支持 UTF-8 和 GBK 编码。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
              id="csv-upload"
              disabled={isUploading}
            />
            <label htmlFor="csv-upload">
              <Button asChild disabled={isUploading}>
                <span className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? "上传中..." : "选择 CSV 文件"}
                </span>
              </Button>
            </label>
            <Button variant="outline" onClick={downloadTemplate} disabled={isUploading}>
              <Download className="mr-2 h-4 w-4" />
              下载模板
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4" />
              <span>支持 UTF-8 和 GBK 编码的 CSV 文件</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
              <AlertCircle className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          {!uploadResult && (
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">CSV 格式示例：</p>
              <pre className="overflow-x-auto text-xs">
                {`platform,url,comment1,comment2,comment3
小红书,https://example.com/post1,评论内容1,评论内容2,
抖音,https://example.com/post2,评论内容3,评论内容4,评论内容5`}
              </pre>
            </div>
          )}
        </div>
      </CardContent>

      {/* 平台统计和二维码 */}
      {uploadResult && (
        <CardContent className="border-t pt-6">
          <div className="space-y-6">
            {/* 平台统计 */}
            <div>
              <h3 className="font-medium mb-4">平台统计</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(uploadResult.platformStats).map(([platform, count]) => (
                  <div
                    key={platform}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <p className="text-sm text-muted-foreground mb-1">平台</p>
                    <p className="text-lg font-bold">{platform}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {count} 个帖子
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 访问链接和二维码 */}
            {uploadResult.qrCodes && uploadResult.qrCodes.length > 0 && (
              <div>
                <h3 className="font-medium mb-4">访问链接和二维码</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {uploadResult.qrCodes.map((qr) => (
                    <div
                      key={qr.platform}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{qr.platform}</h4>
                        {qr.qrImageUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = qr.qrImageUrl!;
                              link.download = `${uploadResult.batchId.slice(0, 8)}-${qr.platform}.png`;
                              link.target = "_blank";
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            下载二维码
                          </Button>
                        )}
                      </div>
                      
                      {/* PC 端链接 */}
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">PC 端访问：</p>
                        <Button
                          variant="outline"
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
                          <p className="text-xs text-muted-foreground">手机端扫码：</p>
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
              </div>
            )}

            {/* 如果没有链接，显示提示 */}
            {(!uploadResult.qrCodes || uploadResult.qrCodes.length === 0) && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <QrCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>链接生成中，请稍后刷新页面查看</p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

