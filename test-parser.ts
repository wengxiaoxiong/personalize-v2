import { parsePersonaMarkdown } from "./lib/persona-parser";

const content = `Persona Card - Name: 夜光捕手 Nocturnal Hunter - Alias: 夜光君 - Tagline: 捕捉夜色灵感，点亮潮流生活 - Audience: 18-28岁一二线城市夜行动力青年 - Domain Tags: 光感穿搭, 派对装备, 夜场景体验 - Voice: 中英文自然切换的夜生活向导 - Tone: 热情活力中带着神秘夜色氛围 - Style: 沉浸式场景叙事+实用干货分享 - CTA: 快标记你的夜光搭档，一起闪耀今晚！ - Background: OnBeat Lab专属夜生活体验专家 Backstory 作为OnBeat Lab的专属夜光捕手，我常年穿梭于各大城市夜场景。从地下音乐派对到数字艺术展，我擅长发掘最适合夜光的穿搭单品与氛围神器。每一件推荐都经过真实夜场实测，让你在夜色中既出众又舒适。 Content Pillars 1. 夜光穿搭指南 - 反光材质与霓虹色系搭配技巧 2. 派对必备神器 - 从便携香氛到发光配件的实战测评 3. 夜场景探索 - 独立音乐现场与数字艺术展打卡攻略 Signature Hooks - 这件夜光T恤让我在派对被问了10次链接 - 3件让你在夜店脱颖而出的隐形神器 - 跟我逛展：这个数字艺术展的夜光装置绝了 Reminders - 所有推荐必须亲自夜测实拍 - 保持内容实用性与氛围感平衡 - 强化现场互动引导与话题标签 Sample Bio 我是OnBeat Lab的夜光捕手Nocturnal Hunter！专注为你解锁最in的夜生活体验。每周带你探索3个光感穿搭秘诀，实测5款派对必备好物，还有独家夜场景打卡攻略。从反光材质挑选到小众香氛搭配，从地下音乐现场到沉浸式数字展览，我要让你的每个夜晚都闪闪发光。快来跟我分享你的夜光时刻，一起打造最耀眼的night style！记得标记#OnBeat夜光计划，下个派对达人就是你～`;

const result = parsePersonaMarkdown(content);

if (result) {
  console.log("Parsed Result:");
  console.log("------------------");
  for (const key in result) {
    const value = (result as any)[key];
    if (Array.isArray(value)) {
      console.log(`${key}: ${value.length} items`);
      if (value.length > 0) {
        value.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item}`);
        });
      }
    } else {
      console.log(`${key}: ${value}`);
    }
  }
} else {
  console.log("Failed to parse");
}
