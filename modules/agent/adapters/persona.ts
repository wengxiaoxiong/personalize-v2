import type { UIMessage } from "ai";
import { buildFallbackPersona, parsePersonaMarkdown, type PersonaParseResult } from "@/lib/persona-parser";

export const PERSONA_TOOL_NAME = "finalizePersona";
export const PERSONA_GENERATE_KEYWORDS = ["生成人设", "生成", "开始生成", "生成吧", "可以生成了"];
export const PERSONA_PDF_MARKER = "[已上传简历/PDF]";
export const PERSONA_XHS_MARKER = "[已导入小红书数据]";

export const buildPersonaPayload = (messages: UIMessage[]) => {
  const hasPdfContent = messages.some(
    (msg) =>
      msg.role === "user" &&
      msg.parts?.some((part) => part.type === "text" && part.text.includes(PERSONA_PDF_MARKER))
  );

  const hasXhsContent = messages.some(
    (msg) =>
      msg.role === "user" &&
      msg.parts?.some((part) => part.type === "text" && part.text.includes(PERSONA_XHS_MARKER))
  );

  if (hasPdfContent || hasXhsContent) {
    const marker = hasPdfContent ? PERSONA_PDF_MARKER : PERSONA_XHS_MARKER;
    const sourceType = hasPdfContent ? "PDF" : "小红书";
    
    const sourceMessage = messages.find(
      (msg) =>
        msg.role === "user" &&
        msg.parts?.some((part) => part.type === "text" && part.text.includes(marker))
    );
    const userSupplements = messages
      .filter(
        (msg) =>
          msg.role === "user" &&
          !msg.parts?.some((part) => part.type === "text" && part.text.includes(marker))
      )
      .map((msg) =>
        msg.parts
          ?.filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("") ?? ""
      )
      .join("\n");

    const sourceText =
      sourceMessage?.parts
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("")
        .replace(`${marker}\n\n`, "") || "";

    return {
      brief: sourceText + (userSupplements ? `\n\n用户补充需求：\n${userSupplements}` : ""),
      goal: `基于导入的${sourceType}内容和用户补充的需求，生成一个可直接用于  dashboard 的人设模板，并突出互动性。`,
    };
  }

  return {
    messages: messages.map((msg) => ({
      role: msg.role,
      content:
        msg.parts
          ?.filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("") ?? "",
    })),
  };
};

export const parsePersonaResult = (text: string): PersonaParseResult => {
  const parsed = parsePersonaMarkdown(text);
  return parsed ?? buildFallbackPersona(text);
};
