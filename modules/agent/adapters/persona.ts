import type { UIMessage } from "ai";
import { buildFallbackPersona, parsePersonaMarkdown, type PersonaParseResult } from "@/lib/persona-parser";

export const PERSONA_TOOL_NAME = "finalizePersona";
export const PERSONA_GENERATE_KEYWORDS = ["生成人设", "生成", "开始生成", "生成吧", "可以生成了"];
export const PERSONA_PDF_MARKER = "[已上传简历/PDF]";

export const buildPersonaPayload = (messages: UIMessage[]) => {
  const hasPdfContent = messages.some(
    (msg) =>
      msg.role === "user" &&
      msg.parts?.some((part) => part.type === "text" && part.text.includes(PERSONA_PDF_MARKER))
  );

  if (hasPdfContent) {
    const pdfMessage = messages.find(
      (msg) =>
        msg.role === "user" &&
        msg.parts?.some((part) => part.type === "text" && part.text.includes(PERSONA_PDF_MARKER))
    );
    const userSupplements = messages
      .filter(
        (msg) =>
          msg.role === "user" &&
          !msg.parts?.some((part) => part.type === "text" && part.text.includes(PERSONA_PDF_MARKER))
      )
      .map((msg) =>
        msg.parts
          ?.filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("") ?? ""
      )
      .join("\n");

    const pdfText =
      pdfMessage?.parts
        ?.filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("")
        .replace(`${PERSONA_PDF_MARKER}\n\n`, "") || "";

    return {
      brief: pdfText + (userSupplements ? `\n\n用户补充需求：\n${userSupplements}` : ""),
      goal: "基于上传的PDF内容和用户补充的需求，生成一个可直接用于 KOS dashboard 的人设模板，并突出互动性。",
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
