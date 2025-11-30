import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const pricing = [
  {
    title: "Free",
    price: "¥0",
    highlight: false,
    items: ["5次生成/月", "2个基础人设模板"],
    cta: "免费开始",
  },
  {
    title: "Pro",
    price: "¥79",
    highlight: true,
    items: ["100次生成/月", "5个自定义人设", "全部人设模板库", "图片AI增强"],
    cta: "立即订阅",
  },
  {
    title: "Business",
    price: "¥199",
    highlight: false,
    items: ["无限次生成", "无限自定义人设", "团队协作功能"],
    cta: "联系销售",
  },
];

export function LandingPricing() {
  return (
    <section id="pricing" className="px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold">简单透明的定价</h2>
        </div>
        <div className="grid items-center gap-8 md:grid-cols-3">
          {pricing.map((plan) => (
            <Card key={plan.title} className={cn("h-fit relative", plan.highlight && "border-primary")}>
              {plan.highlight && (
                <Badge className="absolute right-4 top-4">POPULAR</Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.title}</CardTitle>
                <div className="my-4 text-4xl font-bold">
                  {plan.price}
                  <span className="text-base font-medium"> /月</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="mb-8 space-y-3 text-sm">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.highlight ? "default" : "outline"}>
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

