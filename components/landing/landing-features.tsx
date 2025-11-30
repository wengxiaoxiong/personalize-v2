import { FileText, Users, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const featureSteps = [
  {
    icon: <FileText className="h-6 w-6" />,
    title: "素材解析",
    desc: "支持 PDF、PPT、白底图。自动提取卖点、规格参数，OCR 识别包装文字。",
    accent: "text-slate-900",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "人设匹配",
    desc: "选择\"美妆KOL\"、\"科技测评师\"或自定义人设。基于人格维度调整语气与关注点。",
    accent: "text-orange-500",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "全平台生成",
    desc: "一键输出小红书图文、IG 贴文、LinkedIn 专业稿。包含自动配图与排版。",
    accent: "text-green-500",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold">核心流程</h2>
          <p className="text-muted-foreground">三步实现内容自动化</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {featureSteps.map((step) => (
            <Card key={step.title}>
              <CardHeader>
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border">
                  {step.icon}
                </div>
                <CardTitle className="text-2xl">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{step.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

