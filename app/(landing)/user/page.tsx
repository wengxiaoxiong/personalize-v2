"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Copy,
  ExternalLink,
  Upload,
  CheckCircle2,
  AlertCircle,
  Lock,
  CheckCircle,
} from "lucide-react";

interface Task {
  commentId: string;
  content: string;
  url: string;
  platform: string;
  sessionId: string;
}

type StepStatus = "pending" | "active" | "completed";

/** 安全复制到剪贴板：优先 Clipboard API，否则用 execCommand 兼容移动端/非 HTTPS */
function copyToClipboardFallback(text: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    // ignore
  }
  document.body.removeChild(textarea);
  return Promise.resolve(ok);
}

function UserTaskContent() {
  const searchParams = useSearchParams();
  const platform = searchParams.get("platform");
  const batchId = searchParams.get("batch");

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 步骤状态
  const [step1Status, setStep1Status] = useState<StepStatus>("active"); // 复制评论
  const [step2Status, setStep2Status] = useState<StepStatus>("pending"); // 跳转链接
  const [step3Status, setStep3Status] = useState<StepStatus>("pending"); // 上传截图
  const [step4Status, setStep4Status] = useState<StepStatus>("pending"); // 完成
  
  const [copied, setCopied] = useState(false);
  const [linkOpened, setLinkOpened] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchTask = async () => {
      if (!platform) {
        setError("缺少平台参数");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ platform });
        if (batchId) {
          params.append("batch", batchId);
        }

        const response = await fetch(`/api/task-distribution/user/task?${params.toString()}`);
        const result = await response.json();

        if (result.ok && result.data?.task) {
          setTask(result.data.task);
        } else {
          setError(result.message || "获取任务失败");
        }
      } catch (error) {
        console.error("获取任务失败:", error);
        setError(error instanceof Error ? error.message : "获取任务失败");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [platform, batchId]);

  const handleCopy = async () => {
    if (!task) return;

    const ok = await copyToClipboardFallback(task.content);
    if (ok) {
      setCopied(true);
      setStep1Status("completed");
      setStep2Status("active");
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert("复制失败，请长按上方评论内容手动复制");
    }
  };

  const handleLinkClick = () => {
    setLinkOpened(true);
    setStep2Status("completed");
    setStep3Status("active"); // 解锁下一步
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith("image/")) {
        alert("请选择图片文件");
        return;
      }
      // 验证文件大小（5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert("图片文件过大，最大 5MB");
        return;
      }
      setScreenshot(file);
      setStep3Status("completed");
      setStep4Status("active"); // 解锁提交
    }
  };

  const handleSubmit = async () => {
    if (!task || !screenshot) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("commentId", task.commentId);
      formData.append("sessionId", task.sessionId);
      formData.append("screenshot", screenshot);

      const response = await fetch("/api/task-distribution/user/submit", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.ok) {
        setStep4Status("completed");
        setIsCompleted(true);
      } else {
        alert(result.message || "提交失败");
      }
    } catch (error) {
      console.error("提交失败:", error);
      alert("提交失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">正在获取任务...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">获取任务失败</p>
              <p className="text-sm text-muted-foreground">{error || "任务不存在"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">任务完成！</p>
              <p className="text-sm text-muted-foreground">感谢您的参与</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case "active":
        return <div className="h-5 w-5 rounded-full bg-primary border-2 border-primary" />;
      case "pending":
        return <Lock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const isStepDisabled = (status: StepStatus) => status === "pending";

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* 平台信息 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>任务详情</CardTitle>
                <CardDescription className="mt-1">
                  平台：<Badge variant="secondary">{task.platform}</Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 任务流程 */}
        <Card>
          <CardHeader>
            <CardTitle>任务流程</CardTitle>
            <CardDescription>请按照步骤完成任务，完成当前步骤后才能进行下一步</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 步骤 1: 复制评论内容 */}
            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                step1Status === "active"
                  ? "border-primary bg-primary/5"
                  : step1Status === "completed"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-muted bg-muted/50 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">{getStepIcon(step1Status)}</div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">步骤 1: 复制评论内容</h3>
                    {step1Status === "completed" && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        已完成
                      </Badge>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-background border select-text" role="textbox" aria-label="评论内容，可长按复制">
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{task.content}</p>
                  </div>
                  <Button
                    onClick={handleCopy}
                    disabled={isStepDisabled(step1Status)}
                    variant={step1Status === "active" ? "default" : "outline"}
                    className="w-full"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        复制评论内容
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* 步骤 2: 跳转到帖子链接 */}
            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                step2Status === "active"
                  ? "border-primary bg-primary/5"
                  : step2Status === "completed"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-muted bg-muted/50 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">{getStepIcon(step2Status)}</div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">步骤 2: 跳转到帖子并发布评论</h3>
                    {step2Status === "completed" && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        已完成
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    打开帖子链接，发布刚才复制的评论内容
                  </p>
                  <a
                    href={task.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleLinkClick}
                    className="block"
                  >
                    <Button
                      disabled={isStepDisabled(step2Status)}
                      variant={step2Status === "active" ? "default" : "outline"}
                      className="w-full"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {linkOpened ? "已打开链接" : "打开帖子链接"}
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            {/* 步骤 3: 上传截图 */}
            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                step3Status === "active"
                  ? "border-primary bg-primary/5"
                  : step3Status === "completed"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-muted bg-muted/50 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">{getStepIcon(step3Status)}</div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">步骤 3: 上传截图</h3>
                    {step3Status === "completed" && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        已完成
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    上传您发布评论后的截图（JPG/PNG，最大 5MB）
                  </p>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleScreenshotChange}
                    className="hidden"
                    id="screenshot-upload"
                    disabled={isStepDisabled(step3Status)}
                  />
                  <label htmlFor="screenshot-upload">
                    <Button
                      disabled={isStepDisabled(step3Status)}
                      variant={step3Status === "active" ? "default" : "outline"}
                      className="w-full"
                      asChild
                    >
                      <span className="cursor-pointer">
                        <Upload className="mr-2 h-4 w-4" />
                        {screenshot ? screenshot.name : "选择截图文件"}
                      </span>
                    </Button>
                  </label>
                  {screenshot && (
                    <div className="mt-3">
                      <img
                        src={URL.createObjectURL(screenshot)}
                        alt="截图预览"
                        className="w-full rounded-lg border max-h-64 object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 步骤 4: 提交任务 */}
            <div
              className={`p-4 rounded-lg border-2 transition-all ${
                step4Status === "active"
                  ? "border-primary bg-primary/5"
                  : step4Status === "completed"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-muted bg-muted/50 opacity-60"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">{getStepIcon(step4Status)}</div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">步骤 4: 提交任务</h3>
                    {step4Status === "completed" && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        已完成
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={isStepDisabled(step4Status) || isSubmitting}
                    variant={step4Status === "active" ? "default" : "outline"}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        提交中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        提交任务
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function UserTaskLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">加载中...</p>
      </div>
    </div>
  );
}

export default function UserTaskPage() {
  // 为避免 SSR 与客户端初始渲染不一致，首次仅渲染统一的 Loading，占位到客户端挂载完成
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <UserTaskLoading />;
  }

  return <UserTaskContent />;
}

