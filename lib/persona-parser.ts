export type PersonaParseResult = {
  name: string;
  alias: string;
  tagline: string;
  audience: string;
  voice: string;
  tone: string;
  domainTags: string[];
  style: string;
  background: string;
  contentPillars: string[];
  hooks: string[];
  reminders: string[];
  bio: string;
  callToAction: string;
  rawMarkdown: string;
};

const fieldMap: Record<
  keyof Omit<
    PersonaParseResult,
    "domainTags" | "contentPillars" | "hooks" | "reminders" | "rawMarkdown"
  >,
  string[]
> = {
  name: ["Name", "Persona Name", "人设名", "人设名称"],
  alias: ["Alias", "Nickname", "别名", "角色标签"],
  tagline: ["Tagline", "Slogan", "人设标签", "个性签名"],
  audience: ["Audience", "Target Audience", "受众", "目标人群"],
  voice: ["Voice", "Voice Guidelines", "表达声音", "口吻"],
  tone: ["Tone", "Tone & Mood", "语气", "氛围"],
  style: ["Style", "表达风格", "叙述风格"],
  background: ["Background", "Backstory", "人设背景", "设定背景"],
  callToAction: ["CTA", "Call To Action", "引导语", "行动号召"],
  bio: ["Bio", "简介", "Profile", "人设简介"],
};

const flatFieldLabels = Array.from(new Set(Object.values(fieldMap).flat()));
const sectionLabels = [
  "Content Pillars",
  "Signature Hooks",
  "Reminders",
  "Sample Bio",
  "Persona Bio",
  "Bio"
];
const domainTagsLabels = [
  "Domain Tags",
  "领域标签",
  "擅长领域"
];
const allFieldLabels = [...flatFieldLabels, ...sectionLabels, ...domainTagsLabels];
const joinedFieldLabels = allFieldLabels.map(escapeRegExp).join("|");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanupFieldValue(value: string) {
  const guardRegex = new RegExp(`\\s+-\\s+(?:${joinedFieldLabels})(?:[:：-]|\\s\\d+[.)])|\\s+(?:${sectionLabels.map(escapeRegExp).join("|")})\\s`, "i");
  const trimmed = value.split(guardRegex)[0] ?? value;
  return trimmed.trim();
}

function matchField(markdown: string, labels: string[]) {
  for (const label of labels) {
    const regex = new RegExp(
      `(?:^|\\n|[-*•+\\s])\\s*(?:${escapeRegExp(label)})\\s*(?:[:：-]\\s*)([^\\n]+)`,
      "i",
    );
    const match = markdown.match(regex);
    if (match?.[1]) {
      return cleanupFieldValue(match[1]);
    }
  }
  return "";
}

function extractSection(markdown: string, heading: string) {
  const headingPattern = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Try with ## header first
  const markdownSectionRegex = new RegExp(`##\\s*${headingPattern}[\\s\\S]*?(?=\\n##\\s|$)`, "i");
  const markdownMatch = markdown.match(markdownSectionRegex);
  if (markdownMatch) {
    return markdownMatch[0];
  }

  // Try without header (like "Content Pillars 1.")
  const plainSectionRegex = new RegExp(
    `${headingPattern}[\\s\\S]*?(?=\\s+(?:${sectionLabels.filter(l => l !== heading).map(escapeRegExp).join("|")})\\s|$)`,
    "i"
  );
  const plainMatch = markdown.match(plainSectionRegex);
  return plainMatch ? plainMatch[0] : "";
}

function extractList(section: string) {
  if (!section) return [];
  return section
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[-*•+]|^\d+[\.\)]/.test(line))
    .map((line) => line.replace(/^[-*•+\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function extractParagraph(section: string) {
  if (!section) return "";
  const lines = section.split("\n").slice(1).map((line) => line.trim());
  return lines.filter(Boolean).join("\n");
}

function extractDomainTags(markdown: string) {
  const regex = new RegExp(
    `(?:Domain Tags|领域标签|擅长领域)\\s*(?:[:：-]\\s*)([^\\n]+)`,
    "i",
  );
  const match = markdown.match(regex);
  if (!match?.[1]) return [];
  const cleaned = cleanupFieldValue(match[1]);
  return cleaned
    .split(/[,，、/]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function parsePersonaMarkdown(markdown: string): PersonaParseResult | null {
  if (!markdown?.trim()) {
    return null;
  }

  const normalized = markdown.replace(/\r\n/g, "\n");
  const normalizedPlain = normalized.replace(/\*\*/g, "");

  const contentPillars = extractList(extractSection(normalized, "Content Pillars"));
  const hooks = extractList(extractSection(normalized, "Signature Hooks"));
  const reminders = extractList(extractSection(normalized, "Reminders"));
  const bioSection =
    extractSection(normalized, "Sample Bio") ||
    extractSection(normalized, "Persona Bio") ||
    extractSection(normalized, "Bio");

  return {
    name: matchField(normalizedPlain, fieldMap.name) || "",
    alias: matchField(normalizedPlain, fieldMap.alias) || "",
    tagline: matchField(normalizedPlain, fieldMap.tagline) || "",
    audience: matchField(normalizedPlain, fieldMap.audience) || "",
    voice: matchField(normalizedPlain, fieldMap.voice) || "",
    tone: matchField(normalizedPlain, fieldMap.tone) || "",
    style: matchField(normalizedPlain, fieldMap.style) || "",
    background:
      matchField(normalizedPlain, fieldMap.background) ||
      extractParagraph(extractSection(normalized, "Backstory")) ||
      "",
    callToAction: matchField(normalizedPlain, fieldMap.callToAction) || "",
    bio: extractParagraph(bioSection) || matchField(normalizedPlain, fieldMap.bio) || "",
    domainTags: extractDomainTags(normalizedPlain),
    contentPillars,
    hooks,
    reminders,
    rawMarkdown: normalized,
  };
}
