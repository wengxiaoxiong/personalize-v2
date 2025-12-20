import { buildFallbackPersona } from "@/lib/persona-parser";
import type { SelectionQuestion } from "@/modules/agent/types/questions";

export const QUESTIONS = [
  "嗨～ 先跟我说说你的账号是个人账号还是公司账号呀？比如「个人」或者「OnBeat Lab 品牌账号」这样～",
  "接下来告诉我账号主体的性别和生活特征吧！比如「女性，喜欢夜生活、独立音乐、数字艺术」",
  "目标受众是哪些小伙伴呢？比如「18-28岁一二线城市潮流青年」",
  "内容主要覆盖哪些领域呀？比如「穿搭、香氛、线下派对、数字艺术展」",
  "有没有平台特定要求或互动需求？比如「小红书/抖音适配，需要带动现场互动」",
];

const selectionBlockRegex = /<选择题>([\s\S]*?)<\/选择题>/g;

export const extractSelectionQuestions = (
  text: string
): { cleanText: string; questions: SelectionQuestion[] } => {
  selectionBlockRegex.lastIndex = 0;
  const questions: SelectionQuestion[] = [];
  const matches = Array.from(text.matchAll(selectionBlockRegex));

  for (const match of matches) {
    const block = match[1] ?? "";
    const titleMatch = block.match(/<题目>([\s\S]*?)<\/题目>/);
    const optionMatches = Array.from(block.matchAll(/<选项>([\s\S]*?)<\/选项>/g))
      .map((m) => (m[1] ?? "").trim())
      .filter((opt): opt is string => opt.length > 0);

    const title = titleMatch?.[1]?.trim() ?? "";
    if (title && optionMatches.length > 0) {
      questions.push({ title, options: optionMatches });
    }
  }

  const cleanText = matches.length > 0 ? text.replace(selectionBlockRegex, "").trim() : text;
  return { cleanText, questions };
};

export { buildFallbackPersona };
